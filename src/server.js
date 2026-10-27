import { createApp } from './app.js';

const PORT = process.env.PORT || 8080;
const app = createApp();

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`FairWork Server running on http://localhost:${PORT}`);
  console.log(`Frontline safety & transparency active across Warehousing & Healthcare.`);
});

export { app, server };
