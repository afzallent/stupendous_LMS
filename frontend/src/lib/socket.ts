// Socket.IO server setup
import { Server } from 'socket.io';

export function setupSocket(io: Server) {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join a course room for real-time updates
    socket.on('join-course', (courseId: string) => {
      socket.join(`course-${courseId}`);
      console.log(`Socket ${socket.id} joined course-${courseId}`);
    });

    // Leave a course room
    socket.on('leave-course', (courseId: string) => {
      socket.leave(`course-${courseId}`);
      console.log(`Socket ${socket.id} left course-${courseId}`);
    });

    // Handle discussion messages
    socket.on('discussion-message', (data: { courseId: string; message: any }) => {
      io.to(`course-${data.courseId}`).emit('new-message', data.message);
    });

    // Handle progress updates
    socket.on('progress-update', (data: { courseId: string; progress: any }) => {
      io.to(`course-${data.courseId}`).emit('progress-changed', data.progress);
    });

    // Handle notifications
    socket.on('send-notification', (data: { userId: string; notification: any }) => {
      io.to(`user-${data.userId}`).emit('notification', data.notification);
    });

    // Join user-specific room for notifications
    socket.on('join-user', (userId: string) => {
      socket.join(`user-${userId}`);
      console.log(`Socket ${socket.id} joined user-${userId}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}
