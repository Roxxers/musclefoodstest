
/**
 * Interface for coins
 * @property weight represents the coins weight in grams up to 3 decimal points
 * @property value represents the coins value in cents, pence, etc.
 */
export default interface Coin {
    weight: number;
    value: number;
}