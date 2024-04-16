function maxAdjacentSum(arr) {
    let maxSum = -Infinity;
    for (let i = 0; i < arr.length - 1; i++) {
        let sum = arr[i] + arr[i + 1];
        if (sum > maxSum) {
            maxSum = sum;
        }
    }
    return maxSum;
}

const array = [1, 2, 3, 4, 5];
console.log(maxAdjacentSum(array)); // Debería imprimir 9 (la suma más alta es 4 + 5)
