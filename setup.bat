@echo off
echo Installing frontend dependencies...
call npm install

echo Installing server dependencies...
cd server
call npm install
cd ..

echo Setup complete! Run 'npm run dev' to start the frontend and 'npm run server' in another terminal to start the signaling server.
pause

