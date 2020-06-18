
import Coin from "./coin";


export interface CoinInventory extends Record<string, number> {}


export interface InventoryItem {
    name: string;
    price: number; // Value in cents, pennies, etc.
    quantity: number;
}


export default class VendingMachine {
    public insertedCoins: Coin[]; // This is the coins being held till a transaction is complete or ejection
    public insertedCoinsValue: number;
    public coinInv: CoinInventory; // Keeps count of the amount of coins of each type within the machine - NOT ONES IN HOLD
    public inventory: InventoryItem[];
    public display: string; // Screen display string
    private validCoins: Coin[]; // Currency that is valid for the machine - USER CONFIG
    private coinInvIndex: number[];

    constructor(acceptedCoins: Coin[], inventory: InventoryItem[]) {
        this.display = "INSERT COINS";
        this.insertedCoins = [];
        this.insertedCoinsValue = 0;
        this.validCoins = acceptedCoins;
        this.inventory = inventory;
        this.coinInv = this.createCoinInventoryRecord();
        this.coinInvIndex = Object.keys(this.coinInv).map((x) => {return parseInt(x, 10);});
    }

    private createCoinInventoryRecord(): CoinInventory {
        const coins: CoinInventory = {};
        this.validCoins.forEach(coin => {
            coins[coin.value] = 0; // Set amount of this coin in the machine to zero
        });
        return coins;
    }

    public calcChange(): Coin[] {
        const coins = this.coinInvIndex;
        let amount = 130;

        const change: Coin[] = [];

        for (const coin of coins.sort((a, b) => b - a)) {
            const coinObj = this.validCoins.find(c => c.value === coin);

            if (!coinObj) {
                continue; // Move on to next coin
            }
            while (amount >= coin && this.coinInv[coin] > 0) {
                amount -= coin;
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
                this.insertedCoinsValue += coin.value;
                this.insertedCoins.push(coin);
                coinAccepted = true;
            }
        });
        return coinAccepted;
    }

    /**
     * Call for when eject button is pressed on the machine
     */
    public ejectCoins(): void {
        this.insertedCoins = [];
        this.insertedCoinsValue = 0;
    }
}