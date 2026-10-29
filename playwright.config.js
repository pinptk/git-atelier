'use strict';
const {defineConfig} = require('@playwright/test');
module.exports=defineConfig({
  testDir:'./tests/browser',fullyParallel:true,timeout:30000,
  use:{channel:'msedge',headless:true,viewport:{width:1440,height:1000},baseURL:'http://127.0.0.1:5173',screenshot:'only-on-failure',trace:'retain-on-failure'},
  webServer:{command:'node server.js',url:'http://127.0.0.1:5173',reuseExistingServer:true,timeout:10000},
  reporter:'list'
});
