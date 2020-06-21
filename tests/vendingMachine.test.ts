
import { assert } from "chai";
import { describe } from  "mocha";
import Coin from "../src/coin";
import VendingMachine, { Inventory, DisplayText } from "../src/vendingMachine";

// Replacement for a configuration system to allow vendors to set accepted keys
const coins: Coin[] = [
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

const inventory: Inventory = {
    "A1": {
        "name": "chips",
        "price": 65,
        "quantity": 3
    }
};


function constructVendingMachine(): VendingMachine {
    return new VendingMachine(coins, inventory);
}


describe("Accepting, Rejecting, and Ejecting coins.", () => {
    it("Valid coins should be accepted and added to total currency in the machine", () => {
        const vm = constructVendingMachine();
        const coin = coins[1];
        const isAccepted = vm.insertCoin(coin.weight);
        assert.strictEqual(coin.value, vm.insertedCoinsValue);
        assert.isTrue(isAccepted);
    });
    it("Non-valid coins should be rejected", () => {
        const vm = constructVendingMachine();
        const isAccepted = vm.insertCoin(42);
        assert.isFalse(isAccepted);
    });
    it("Pressing eject should eject all coins inserted by user and reset internal counter", () => {
        const vm = constructVendingMachine();
        const coin = coins[1];
        vm.insertCoin(coin.weight);
        // No need to check for proper insertion as this is covered by another test
        vm.ejectCoins();
        assert.strictEqual(vm.insertedCoinsValue, 0);
        assert.strictEqual(vm.insertedCoins.length, 0);
    });
    it("Coin inventory is correctly adapted on purchase and release of on-hold coins", () => {
        assert.isTrue(true); // TODO: Test for this
    });
});

describe("Buying and change", () => {
    it("Trying to buy an item without enough coins will display the correct string and not doing anything else", () => {
        const vm = constructVendingMachine();
        const returnedCoins = vm.buyItem("A1");
        assert.lengthOf(returnedCoins, 0);
        assert.strictEqual(vm.display, vm.formatPriceText(inventory.A1.price));
    });
});

// Display tests to make sure displays are correct and also formatted correctly
