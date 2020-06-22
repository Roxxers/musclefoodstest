
import { assert } from "chai";
import { describe } from  "mocha";
import Coin from "../src/coin";
import VendingMachine, { Inventory, DisplayText } from "../src/vendingMachine";


class TestHelper {
    public coins: Coin[];
    public vm: VendingMachine;
    public inventory: Inventory;

    constructor() {
        this.coins = [
            {
                weight: 5.000, // Nickel
                value: 5
            },
            {
                weight: 2.268, // Dime
                value: 10
            },
            {
                weight: 5.670, // Quarter
                value: 25
            }
        ];
        this.inventory = {
            "A1": {
                "name": "chips",
                "price": 65,
                "quantity": 3
            }
        };
        this.vm = new VendingMachine(this.coins, this.inventory);
    }

    get A1Price() {
        return this.inventory.A1.price;
    }

    public populateCoinInv() {
        for (const coin of this.coins) {
            this.vm.coinInv[coin.value] = 5;
        }
    }

    public buyTestItem(): Coin[] {
        return this.vm.selectItem("A1");
    }

    public removeAllCoinsFromMachine() {
        for (const key of Object.keys(this.vm.coinInv)) {
            this.vm.coinInv[key] = 0;
        }
    }

    public insertCoinsToAmount(amount: number) {
        const coinsToInsert = this.calcCoinsToInsert(amount, this.coins);
        for (const coin of coinsToInsert) {
            this.vm.insertCoin(coin.weight);
        }
    }

    private calcCoinsToInsert(amount: number, coins: Coin[]): Coin[] {
        // Sort coins from biggest to smallest
        coins = coins.sort((a, b) => b.value - a.value);
        const coinsToInsert: Coin[] = [];
        for (const coin of coins) {
            if (coin.value <= amount) {
                while (amount >= coin.value) {
                    amount -= coin.value;
                    coinsToInsert.push(coin);
                }
            }
        }
        return coinsToInsert;
    }

}


describe("Accepting, Rejecting, and Ejecting coins.", () => {
    it("Valid coins should be accepted and added to total currency in the machine", () => {
        const helper = new TestHelper();
        helper.insertCoinsToAmount(5);
        assert.strictEqual(5, helper.vm.insertedCoinsValue);
    });
    it("Non-valid coins should be rejected", () => {
        const helper = new TestHelper();
        const isAccepted = helper.vm.insertCoin(42);
        assert.isFalse(isAccepted);
    });
    it("Pressing eject should eject all coins inserted by user and reset internal counter", () => {
        const helper = new TestHelper();
        helper.insertCoinsToAmount(5);
        helper.vm.ejectCoins();
        assert.strictEqual(helper.vm.insertedCoins.length, 0);
    });
});

describe("Buying items", () => {
    it("Trying to buy an item with no coins will not dispense the item", () => {
        const helper = new TestHelper();
        helper.buyTestItem();
        assert.strictEqual(helper.vm.lastDispensedItem, null);
    });
    it("Trying to buy an item with not enough coins will not dispense the item", () => {
        const helper = new TestHelper();
        helper.insertCoinsToAmount(helper.A1Price - 5);
        helper.buyTestItem();
        assert.strictEqual(helper.vm.lastDispensedItem, null);
    });
    it("Successfully buy an item and it dispenses", () => { // Maybe change this to not also check for change and move change to a different section
        const helper = new TestHelper();
        helper.insertCoinsToAmount(helper.A1Price);
        helper.buyTestItem();
        assert.strictEqual(helper.vm.lastDispensedItem, helper.inventory.A1);
    });
    it("If a position in machine is selected but not occupied, do nothing", () => {
        const helper = new TestHelper();
        helper.vm.selectItem("B2");
        assert.strictEqual(helper.vm.lastDispensedItem, null);
    });
    it("If a sold out item is selected, do nothing", () => {
        const helper = new TestHelper();
        helper.vm.inventory.A1.quantity = 0;
        helper.insertCoinsToAmount(helper.A1Price);
        helper.buyTestItem();
        assert.strictEqual(helper.vm.lastDispensedItem, null);
    });
    it("When an item is purchased, the state of the machine needs to reset", () => {
        const helper = new TestHelper();
        helper.insertCoinsToAmount(helper.A1Price);
        helper.buyTestItem();
        assert.lengthOf(helper.vm.insertedCoins, 0);
    });
});

describe("Display text should be correct for all instances", () => {
    it(`Display shows "${DisplayText.insert}" on start up and can give exact change`, () => {
        const helper = new TestHelper();
        assert.strictEqual(helper.vm.display, DisplayText.insert);
    });
    it(`Display shows "${DisplayText.exact} when exact change is required and display is updated`, () => {
        const helper = new TestHelper();
        helper.removeAllCoinsFromMachine();
        // This is the way to reset the display
        helper.vm.ejectCoins();
        assert.strictEqual(helper.vm.display, DisplayText.exact);
    });
    it(`Display shows "${DisplayText.price}" when trying to buy an item without enough coins in the machine`, () => {
        const helper = new TestHelper();
        helper.insertCoinsToAmount(helper.A1Price - 5);
        helper.buyTestItem();
        assert.strictEqual(helper.vm.display, helper.vm.formatPriceText(helper.A1Price));
    });
    it(`Display shows "${DisplayText.thank}" on successfully purchasing an item`, () => {
        const helper = new TestHelper();
        helper.insertCoinsToAmount(helper.A1Price);
        helper.buyTestItem();
        assert.strictEqual(helper.vm.display, DisplayText.thank);
    });
    it(`Display shows "${DisplayText.soldOut}" when trying to purchase item that doesn't exist`, () => {
        const helper = new TestHelper();
        helper.vm.selectItem("B2");
        assert.strictEqual(helper.vm.display, DisplayText.soldOut);
    });
    it(`Display shows "${DisplayText.soldOut}" when trying to purchase item that is out of stock`, () => {
        const helper = new TestHelper();
        helper.vm.inventory.A1.quantity = 0;
        helper.vm.selectItem("B2");
        assert.strictEqual(helper.vm.display, DisplayText.soldOut);
    });
});

describe("Change", () => {
    it("Correct change is given when overpaying for an item", () => {
        const helper = new TestHelper();
        const extra = 20;
        helper.populateCoinInv();
        helper.insertCoinsToAmount(helper.A1Price + extra);
        const change = helper.buyTestItem();
        let changeAmount = 0;
        for (const coin of change) {
            changeAmount += coin.value;
        }
        assert.strictEqual(changeAmount, extra);
    });
    it("As much change as possible is given without giving too much when the machine is in exact change mode", () => {
        const helper = new TestHelper();
        const extra = 30;
        helper.vm.coinInv["5"] = 1;
        helper.vm.coinInv["10"] = 2;
        helper.insertCoinsToAmount(helper.A1Price + extra);
        const change = helper.buyTestItem();
        let changeAmount = 0;
        for (const coin of change) {
            changeAmount += coin.value;
        }
        assert.strictEqual(changeAmount, extra - 5);
    });
});