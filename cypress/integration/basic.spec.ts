/// <reference types="cypress" />

describe('Smoke Test', () => {
  it('should render', () => {
    cy.visit('http://localhost:1234');

    cy.get('[data-test-id="zop"]').contains('hello-worldzz');
  });
});
