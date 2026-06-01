/** Pure helpers kept free of framework code so they are trivially unit-testable. */

export function greeting(name = 'world'): string {
  return `Hello, ${name}!`;
}
