const shouldBeAlphaHyphenString = (input: string): string => {
  if(/^[a-zA-Z-]+$/.test(input))
    return input;
  else
    throw new Error(`${input} should be alphanumeric and include hyphens only`); 
}

export { shouldBeAlphaHyphenString }
