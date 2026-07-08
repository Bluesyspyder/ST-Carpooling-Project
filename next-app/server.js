const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '5000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    // Inject global CORS headers for all incoming requests (API and preflight)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
    // Note: no Access-Control-Allow-Credentials here — this app authenticates via a
    // Bearer token header, not cookies, and the spec forbids combining a wildcard
    // origin with credentials:true (browsers reject the response outright).

    // Instantly return 200 OK for OPTIONS preflight requests
    if (req.method === 'OPTIONS') {
      res.statusCode = 200;
      res.end();
      return;
    }

    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request', err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`[SOCKET] Client connected: ${socket.id}`);

    // Join a specific ride room
    socket.on('join_ride', (rideId) => {
      socket.join(`ride_${rideId}`);
      console.log(`[SOCKET] Socket ${socket.id} joined ride_${rideId}`);
    });

    // Leave a specific ride room
    socket.on('leave_ride', (rideId) => {
      socket.leave(`ride_${rideId}`);
      console.log(`[SOCKET] Socket ${socket.id} left ride_${rideId}`);
    });

    // Driver emits location update
    socket.on('driver_location_update', (data) => {
      // Broadcast to all passengers in the ride room
      if (data && data.rideId) {
        io.to(`ride_${data.rideId}`).emit('driver_location_update', data);
      }
    });

    // SOS Panic Button Alert
    socket.on('sos_alert', (data) => {
      if (data && data.rideId) {
        io.to(`ride_${data.rideId}`).emit('sos_alert', data);
      }
    });

    // Driver changed the ride lifecycle status (cancelled / completed / frozen…).
    // Relay to everyone viewing the ride so their UI updates instead of going stale.
    socket.on('ride_status_changed', (data) => {
      if (data && data.rideId) {
        io.to(`ride_${data.rideId}`).emit('ride_status_changed', data);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[SOCKET] Client disconnected: ${socket.id}`);
    });
  });

  server.listen(port, () => {
    console.log(`\n======================================================`);
    console.log(`> App is ready and running!`);
    console.log(`> Please open: http://localhost:${port}`);
    console.log(`> Network IP:  http://${hostname}:${port}`);
    console.log(`> (Socket.io is attached and ready)`);
    console.log(`======================================================\n`);
  });
});
