const clickTabAndAssertPath = (triggerTestId: string, expectedPath: string) => {
  cy.get(`[data-testid="${triggerTestId}"]`).should('be.visible').click({ force: true });
  cy.location('pathname').should('eq', expectedPath);
};

describe('Chart Section Tabs — E2E', () => {
  before(() => {
    cy.window().then((win) => {
      win.localStorage.setItem('inferencex-star-modal-dismissed', String(Date.now()));
    });
    cy.visit('/inference');
  });

  it('updates the URL path when switching tabs', () => {
    clickTabAndAssertPath('tab-trigger-evaluation', '/evaluation');

    clickTabAndAssertPath('tab-trigger-historical', '/historical');

    clickTabAndAssertPath('tab-trigger-calculator', '/calculator');

    clickTabAndAssertPath('tab-trigger-gpu-specs', '/gpu-specs');

    clickTabAndAssertPath('tab-trigger-inference', '/inference');
  });

  it('opens GPU Reliability from the footer link', () => {
    cy.get('[data-testid="tab-trigger-reliability"]').should('not.exist');

    cy.get('[data-testid="footer-link-reliability"]').scrollIntoView().click();
    cy.url().should('include', '/reliability');
    cy.get('[data-testid="reliability-chart-display"]').should('exist');
  });

  it('shows mobile chart select dropdown on small viewport', () => {
    cy.viewport(375, 812);
    cy.visit('/inference');
    cy.get('[data-testid="mobile-chart-select"]').should('be.visible');
  });
});
