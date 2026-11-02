const http = require('http');
const app = require('../server');

const PORT = 8000;
let server;

async function run() {
  server = app.listen(PORT, async () => {
    console.log(`Server started for testing on port ${PORT}`);
    try {
      // Run the test suite
      require('./test-suite');
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  });
}

run();
