function fizzBuzz(num) {
    let message = "";
    if (num % 3 === 0) message += "FIZZ";
    if (num % 5 === 0) message += "BUZZ";
    if (message === "") message = num.toString();
    console.log(message);
    return message;
}


fizzBuzz(3);  // Debería imprimir FIZZ
fizzBuzz(5);  // Debería imprimir BUZZ
fizzBuzz(15); // Debería imprimir FIZZBUZZ
fizzBuzz(7);  // Debería imprimir 7
