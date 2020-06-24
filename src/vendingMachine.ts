
import Coin from "./coin";
import { vsprintf } from "sprintf-js";

/**
 * CoinInventory is an object that represents a coin with a value as an index, and the amount of coins in the machine as the value
 */
export type CoinInventory = Record<string, number>;

/**
 * Interface of an item of a product in one shelf of the machine
 * @prop name - Name representation of the item. Currently unused other than aiding maintenance of the machine
 * @prop price - The price of the item in cents, pennies, etc.
 * @prop quantity - The amount of the item left in this area
 */
export interface InventoryItem {
    name: string;
    price: number;
    quantity: number;
}

/**
 * Type represents the full visible inventory of the machine. It maps location as the key (A2, C4) and the actual item as the value
 */
export type Inventory = Record<string, InventoryItem>;

/**
 * Enum for all display text strings to be displayed on the machines screen
 */
export enum DisplayText {
    insert = "INSERT COINS",
    exact = "EXACT CHANGE ONLY",
    soldOut = "SOLD OUT",
    thank = "THANKS",
    price = "PRICE: $%.2f"
}

/**
 * Class representing the VendingMachine and its logic
 * @prop insertedCoins - the coins being held till a transaction is complete or ejection
 * @prop coinInv - Keeps count of the amount of coins of each type within the machine, this does not include the ones on hold that have been inserted in the machine.
 * @prop inventory - Inventory of the vending machines products
 * @prop display - the text on the display screen, communicating what the machine is doing to the customer
 * @prop lastDispensedItem - Tracks the last item to be dispensed, helpful to check if item was bought without physical mechanism for it
 * @prop validCoins - Current that is valid and is accepted by the machine, this is set by user configuration
 */
export default class VendingMachine {
    public insertedCoins: Coin[];
    public coinInv: CoinInventory;
    public inventory: Inventory;
    public display: string;
    public lastDispensedItem: InventoryItem | null;
    private validCoins: Coin[];

    /**
     * Create a VendingMachine class
     * @param validCoins A list of coins that are accepted by the machine
     * @param inventory An inventory object describing the inventory of products in the machine on boot
     */
    constructor(validCoins: Coin[], inventory: Inventory) {
        this.display = this.checkForExactChangeMode();
        this.insertedCoins = [];
        this.validCoins = validCoins;
        this.inventory = inventory;
        this.coinInv = this.createCoinInventoryRecord();
        this.lastDispensedItem = null;
    }

    /**
     * Get the keys for the coin inventory object and convert them into integers
     * @returns the keys of the coinInv property
     */
    get coinInvIndexes() {
        return Object.keys(this.coinInv).map((x) => parseInt(x, 10));
    }

    /**
     * Calculates the total value of all of the coins inserted into the machine
     * @returns total value of all coins inserted
     */
    public insertedCoinsValue(): number {
        let value: number = 0;
        this.insertedCoins.forEach(coin => {
            value += coin.value;
        });
        return value;
    }

    /**
     * Dynamically checks if the machine has at least 5 of each coin.
     * Ensures we can give change for all situations for all products.
     * @returns if the machine is able to make change or not
     */
    public ableToMakeChange(): boolean {
        for (const coin in this.coinInv) {
            if (!this.coinInv.hasOwnProperty(coin)) continue; // Avoid wacky javascript issues
            if (this.coinInv[coin] < 5) {
                return false;
            }
        }
        return true;
    }

    /**
     * Creates and empty coin inventory as part of initialization
     * This is created as empty as the machine's software has no way of knowing the inv amount. This is something that should be edited later on
     * by a check done by the hardware client this library is being used with for the physical machine.
     * @returns an empty CoinInventory object
     */
    public createCoinInventoryRecord(): CoinInventory {
        const coins: CoinInventory = {};
        this.validCoins.forEach(coin => {
            coins[coin.value] = 0; // Set amount of this coin in the machine to zero
        });
        return coins;
    }

    /**
     * Formats the price string in the DisplayText enum
     * @param itemPrice Price of the item in pence, cents, etc.
     */
    public formatPriceText(itemPrice: number): string {
        return vsprintf(DisplayText.price, [itemPrice / 100]);
    }

    /**
     * Checks the ableToMakeChange property and returns the correct display text accordingly
     * @returns display text string based on if the machine can give change or not
     */
    private checkForExactChangeMode(): string {
        // Function to check if exact change mode should be on, or normal operation
        if (this.ableToMakeChange()) {
            return DisplayText.insert;
        } else {
            return DisplayText.exact;
        }
    }

    /**
     * Buys an item in the machine, dispenses it, sets the display, and calculates the required change to give the customer
     * @param key Location of the item
     * @param item Item as an object
     * @returns change to give the customer
     */
    private buyItem(key: string, item: InventoryItem): Coin[] {
        this.dispenseItem(key, item);
        this.display = DisplayText.thank;
        const amount = this.insertedCoinsValue();
        return this.calcChange(amount - item.price);
    }

    /**
     * Select an item in the machine and if available, buy the item.
     * Updates the display to make sure the customer is informed of what is happening
     * @param key location of item selected by the customer
     * @returns coins to be dispensed as change if a transaction takes place
     */
    public selectItem(key: string) {
        let change: Coin[] = [];
        // Look up item
        const item = this.inventory[key];
        // Item doesn't exist
        if (!item) {
            this.display = DisplayText.soldOut;
        }
        else if (item.quantity <= 0) { // Check if in stock
            this.display = DisplayText.soldOut;
        }
        else if (item.price > this.insertedCoinsValue()) { // Check if coins in the machine actually pay for the item
            this.display = this.formatPriceText(item.price);
        } else {
            change = this.buyItem(key, item);
            this.addCoinsToInv();
        }
        return change;
    }

    /**
     * Calculates change to be given to the customer using a greedy algorithm using what coins are available in the machine's inventory
     * @param changeAmount amount of change from the transaction that needs to be returned to the user
     * @returns the array of coins to be given to the customer as change
     */
    public calcChange(changeAmount: number): Coin[] {
        const coins = this.coinInvIndexes;
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

    /**
     * Takes all coins that have been inserted in the machine and dumps them in the coin inventory.
     * This is done after purchases and after change is given.
     */
    private addCoinsToInv(): void {
        for (const coin of this.insertedCoins) {
            this.coinInv[coin.value] += 1;
        }
        this.insertedCoins = [];
    }

    /**
     * Placeholder function to physically dispense the item. Reduces quantity of item in stock and sets it as the last dispensed item
     * @param key for location of the item in the machine
     * @param item item that is being dispensed
     */
    private dispenseItem(key: string, item: InventoryItem): void {
        this.lastDispensedItem = item;
        this.inventory[key].quantity -= 1;
    }

    /**
     * Resets the machine back to the original state, waiting for coins to be inserted and not having any coins on hold
     */
    public resetMachine(): void {
        this.insertedCoins = [];
        this.display = this.checkForExactChangeMode();
    }

    /**
     * Call for when eject button is pressed on the machine. Also resets display
     */
    public ejectCoins(): void {
        this.resetMachine();
    }
}