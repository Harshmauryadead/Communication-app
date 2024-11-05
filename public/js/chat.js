const socket = io();

const $messageForm = document.querySelector("#messageForm");
const $messageFormInput = $messageForm.querySelector("input");
const $messageFormButton = document.querySelector("#submit");
const $sendLocationButton = document.querySelector("#send-location");
const $message = document.querySelector("#message");

const $messageTemplate = document.querySelector("#message-template").innerHTML;
const $imageTemplate = document.querySelector("#image-template").innerHTML;
const $locationMessageTemplate = document.querySelector(
	"#location-message-template"
).innerHTML;
const $sidebarTemplate = document.querySelector("#room-users").innerHTML;

let { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true });
username = username.trim().toLowerCase();
room = room.trim().toLowerCase();

const autoscroll = () => {
	const $messageBox = document.querySelector("#message");

	const containerHeight = $messageBox.scrollHeight;
	const lastMessageHeight = $message.lastElementChild.offsetHeight;
	const visibleHeight = $messageBox.offsetHeight;
	const CurrScrollHeight = $messageBox.scrollTop;

	if (
		containerHeight - 2 * lastMessageHeight <
		CurrScrollHeight + visibleHeight
	) {
		$message.lastElementChild.scrollIntoView();
	}
};

socket.on("message", (message) => {
	const html = Mustache.render($messageTemplate, {
		username: message.username,
		message: message.text,
		createdAt: moment(message.createdAt).format("h:mm a"),
	});
	$message.insertAdjacentHTML("beforeend", html);

	if (message.username == username) {
		$message.lastElementChild.classList.add("align-self-end");
	}
	autoscroll();
});

socket.on("locationMessage", (message) => {
	const html = Mustache.render($locationMessageTemplate, {
		username: message.username,
		locationURL: message.url,
		createdAt: moment(message.createdAt).format("h:mm a"),
	});

	$message.insertAdjacentHTML("beforeend", html);
	autoscroll();
});

socket.on("roomInfo", ({ room, users }) => {
	const html = Mustache.render($sidebarTemplate, {
		room,
		users,
	});
	document.querySelector("#sidebar").querySelector(".list-group").innerHTML =
		html;
});

$messageForm.addEventListener("submit", (e) => {
	e.preventDefault();

	$messageFormButton.setAttribute("disabled", "disabled");
	let message = $messageFormInput.value;
	socket.emit("sendMessage", message, (error) => {
		$messageFormButton.removeAttribute("disabled");
		$messageFormInput.value = "";
		$messageFormInput.focus();

		if (error) {
			return console.log(error);
		}
		console.log("This message was delivered");
	});
});

$sendLocationButton.addEventListener("click", () => {
	$sendLocationButton.setAttribute("disabled", "disabled");
	if (!navigator.geolocation) {
		return alert("Geolocation is not supported in your browser");
	}

	navigator.geolocation.getCurrentPosition((position) => {
		socket.emit(
			"sendLocation",
			{
				latitude: position.coords.latitude,
				longitude: position.coords.longitude,
			},
			(message) => {
				$sendLocationButton.removeAttribute("disabled");
				console.log(message);
			}
		);
	});
});

socket.emit("join", { username, room }, (error) => {
	if (error) {
		alert(error);
		location.href = "/";
	}
});

socket.on("base64 file", (message) => {
	// msg = {username, file, fileName})
	const html = Mustache.render($imageTemplate, {
		username: message.username,
		file: message.file,
		createdAt: moment(message.createdAt).format("h:mm a"),
	});

	$message.insertAdjacentHTML("beforeend", html);

	if (message.username == username) {
		$message.lastElementChild.classList.add("align-self-end");
	}
	autoscroll();
});

function readThenSendFile(data) {
	var reader = new FileReader();
	reader.onload = function (evt) {
		var msg = {};
		msg.username = username;
		msg.file = evt.target.result;
		msg.fileName = data.name;
		socket.emit("base64 file", msg);
	};
	reader.readAsDataURL(data);
}

document.getElementById("upfile").addEventListener("change", (evt) => {
	var data = evt.target.files[0];
	readThenSendFile(data);
});

function getFile() {
	document.getElementById("upfile").click();
}
