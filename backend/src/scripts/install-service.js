/**
 * Windows Service Installer
 * ------------------------
 * Installs the Node.js app as a Windows Service
 * Run: node src/scripts/install-service.js
 */

const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
  name: 'Indian Stock Analysis API',
  description: 'Indian stock analysis backend with MS SQL Server',
  script: path.join(__dirname, '..', 'server.js'),
  nodeOptions: ['--harmony', '--max_old_space_size=4096'],
  env: [
    {
      name: "NODE_ENV",
      value: "production"
    }
  ]
});

// Listen for the "install" event
svc.on('install', () => {
  console.log('Service installed successfully');
  svc.start();
});

// Listen for the "alreadyinstalled" event
svc.on('alreadyinstalled', () => {
  console.log('Service is already installed');
});

// Listen for the "start" event
svc.on('start', () => {
  console.log('Service started');
});

// Check for uninstall argument
if (process.argv.includes('--uninstall')) {
  svc.uninstall();
  console.log('Service uninstalled');
} else if (process.argv.includes('--stop')) {
  svc.stop();
  console.log('Service stopped');
} else {
  // Install the service
  console.log('Installing service...');
  svc.install();
}
