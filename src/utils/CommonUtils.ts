export class CommonUtils {
    /**
     * Converts a number to a string with proper fraction digits
     */
    static numberToString(num: number): string {
        // const isPositive = num > 0;
        const posNum = Math.abs(num);
        if (posNum < 0.0001) {
            return num.toString();
        }
        let fractionDigits = 2;
        if (posNum < 0.01) {
            fractionDigits = 4;
        } else if (posNum < 0.1) {
            fractionDigits = 3;
        }
        return num.toFixed(fractionDigits);
    }

    /**
     * Converts numbers to a string with proper fraction digits
     */
    static numbersToString(nums: number[]): string {
        return nums.map((num: number) => this.numberToString(num)).join(", ");
    }

    static joinStrings(...args: string[]) {
        return args.join("");
    }
}

export const addPrefix =
    (prefix: string, concat = "-") =>
    (str: string) =>
        `${prefix}${concat}${str}`;
