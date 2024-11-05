const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const Filter = require("bad-words");
const {
	generateMessage,
	generateLocationMessage,
} = require("../src/utils/messages");
const {
	addUser,
	removeUser,
	getUser,
	getUsersInRoom,
} = require("./utils/user");

const app = express();
const server = http.createServer(app);

const io = socketio(server);

const PORT = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, "../public");
app.use(express.static(publicDirectoryPath));

io.on("connection", (socket) => {
	// console.log('New Websocket Connection')

	socket.on("join", (options, callback) => {
		const { error, user } = addUser({ id: socket.id, ...options });

		if (error) {
			return callback(error);
		}

		socket.join(user.room);

		socket.emit("message", generateMessage("Admin", "Welcome!!"));
		socket.broadcast
			.to(user.room)
			.emit(
				"message",
				generateMessage("Admin", `${user.username} has joined the meeting`)
			);
		io.to(user.room).emit("roomInfo", {
			room: user.room,
			users: getUsersInRoom(user.room),
		});
		callback();
	});

	socket.on("sendMessage", (message, callback) => {
		const filter = new Filter();
		if (filter.isProfane(message)) {
			return callback("Cannot be Delivered, it contains Profanity");
		}

		const user = getUser(socket.id);

		io.to(user.room).emit("message", generateMessage(user.username, message));
		callback();
	});

	socket.on("sendLocation", (postion, callback) => {
		const user = getUser(socket.id);

		io.to(user.room).emit(
			"locationMessage",
			generateLocationMessage(
				user.username,
				`https://google.com/maps?q=${postion.latitude},${postion.longitude}`
			)
		);
		callback("Location Shared");
	});

	socket.on("base64 file", function (msg) {
		// console.log("received base64 file from " + msg.username);
		socket.username = msg.username;
		// socket.broadcast.emit('base64 image', //exclude sender
		const user = getUser(socket.id);
		io.to(user.room).emit(
			"base64 file", //include sender

			{
				username: socket.username,
				file: msg.file,
				fileName: msg.fileName,
			}
		);
	});

	socket.on("disconnect", () => {
		const user = removeUser(socket.id);

		if (user) {
			io.to(user.room).emit("roomInfo", {
				room: user.room,
				users: getUsersInRoom(user.room),
			});

			io.to(user.room).emit(
				"message",
				generateMessage("Admin", `${user.username} has left`)
			);
		}
	});
});

server.listen(PORT, () => {
	console.log(`Chat app has started and listening at the port ${PORT}`);
});
