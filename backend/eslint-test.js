// ESLint test file - should show errors
const unused_variable = "this should be single quotes";

function unusedFunction() {
  console.log("double quotes error")
  // missing semicolon
}

// This file should show multiple ESLint errors in VSCode
