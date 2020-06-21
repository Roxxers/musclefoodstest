
import Coin from "./coin";
import { vsprintf } from "sprintf-js";

export interface CoinInventory extends Record<string, number> {}

export interface InventoryItem {
    name: string;
    price: number; // Value in cents, pennies, etc.
    quantity: number;
}

export interface Inventory extends Record<string, InventoryItem> {}

export enum DisplayText {
    insert = "INSERT COINS",
    exact = "EXACT CHANGE ONLY",
    soldOut = "SOLD OUT",
    thank = "THANKS",
    price = "PRICE: $%.2f"
}


export default class VendingMachine {
    public insertedCoins: Coin[]; // This is the coins being held till a transaction is complete or ejection
    public coinInv: CoinInventory; // Keeps count of the amount of coins of each type within the machine - NOT ONES IN HOLD
    public inventory: Inventory;
    public display: string; // Screen display string
    private validCoins: Coin[]; // Currency that is valid for the machine - USER CONFIG
    private coinInvIndex: number[];

    constructor(acceptedCoins: Coin[], inventory: Inventory) {
        this.display = this.checkForExactChangeMode();
        this.insertedCoins = [];
        this.validCoins = acceptedCoins;
        this.inventory = inventory;
        this.coinInv = this.createCoinInventoryRecord();
        this.coinInvIndex = Object.keys(this.coinInv).map((x) => {return parseInt(x, 10);});
    }

    get insertedCoinsValue(): number {
        let value: number = 0;
        this.insertedCoins.forEach(coin => {
            value += coin.value;
        });
        return value;
    }

    get ableToMakeChange(): boolean {
        for (const coin in this.coinInv) {
            if (this.coinInv[coin] < 5) {
                return false;
            }
        }
        return true;
    }

    private createCoinInventoryRecord(): CoinInventory {
        const coins: CoinInventory = {};
        this.validCoins.forEach(coin => {
            coins[coin.value] = 0; // Set amount of this coin in the machine to zero
        });
        return coins;
    }

    public formatPriceText(itemPrice: number): string {
        return vsprintf(DisplayText.price, [itemPrice / 100]);
    }

    private checkForExactChangeMode(): string {
        // Function to check if exact change mode should be on, or normal operation
        if (this.ableToMakeChange) {
            return DisplayText.insert;
        } else {
            return DisplayText.exact;
        }
    }

    public buyItem(key: string): Coin[] {
        // No way to see if we get a false unless you check display
        // Look up item
        const item = this.inventory[key];
        // Item doesn't exist
        if (!item) {
            this.display = DisplayText.soldOut;
            return [];
        }
        // Check if in stock
        if (item.quantity <= 0) {
            this.display = DisplayText.soldOut;
            return [];
        }
        // Check if coins in the machine actually pay for the item
        if (item.price > this.insertedCoinsValue) {
            this.display = this.formatPriceText(item.price);
            return [];
        } else {
            // Give change, if possible
            // Dispense item code here
            item.quantity -= 1;
            this.display = DisplayText.thank;
            const amount = this.insertedCoinsValue;
            return this.calcChange(amount - item.price);
        }
    }

    public calcChange(changeAmount: number): Coin[] {
        const coins = this.coinInvIndex;
        const change: Coin[] = [];

        for (const coin of coins.sort((a, b) => b - a)) {
            const coinObj = this.validCoins.find(c => c.value === coin);

            if (!coinObj) {
                continue; // Move on to next coin
            }
            while (changeAmount >= coin && this.coinInv[coin] > 0) {
                changeAmount -= coin;
                change.push(coinObj);
                this.coinInv[coin] -= 1;
            }
        }
        return change;
    }

    /**
     * Call for when a coin is inserted and is weighed. Decides if machine rejects or accepts coin.
     * @param weight
     * @returns bool if coin was accepted or not
     */
    public insertCoin(weight: number): boolean {
        let coinAccepted: boolean = false;
        this.validCoins.forEach(coin => {
            if (coin.weight === weight) {
                this.insertedCoins.push(coin);
                coinAccepted = true;
            }
        });
        return coinAccepted;
    }

    private resetMachine(): void {
        this.insertedCoins = [];
        this.display = this.checkForExactChangeMode();
    }

    /**
     * Call for when eject button is pressed on the machine. Also resets display
     */
    public ejectCoins(): void {
        // Placeholder here for physically ejecting coins
        this.resetMachine();
    }
}