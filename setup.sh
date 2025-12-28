#!/bin/bash

echo "Installing frontend dependencies..."
npm install

echo "Installing server dependencies..."
cd server
npm install
cd ..

echo "Setup complete! Run 'npm run dev' to start the frontend and 'npm run server' in another terminal to start the signaling server."

