class extends HTMLElement  {
	constructor() {
		super();
		
		this.attachShadow({mode: "open"});

		this.websocketHandler = this.websocketHandler.bind(this);
		this.removeDevice = this.removeDevice.bind(this);
		this.addDevice = this.addDevice.bind(this);
	}

	init(source, config) {
		this.source = source;
		this.config = config;

		this.shadowRoot.innerHTML = `
<link rel="stylesheet" href="/assets/standard.css"/>
<style>
svg > * {
    stroke: var(--clr-accent);
    stroke-width: 30px;
    stroke-linecap: round;
    fill: transparent;
}

#status-table {
	width: 100%;
}
#status-table-body {

}
#status-table-body > * > * {
	text-align: center;
}
</style>
<div class="jmod-wrapper">
	<div class="jmod-header" style="display: flex">
		<h1>Status</h1>
		<svg viewBox="0 0 360 360">
			<path d="M 60 180 h 48 l 48 -90 l 48 180 l 48 -90 h 48"/>
        </svg>
	</div>

	<hr>

	<div class="jmod-body">
		<div id="control-box" style="display: flex; justify-content: flex-end;">
			<button id="button-show-form" onclick="this.getRootNode().host.showAddDeviceForm()" style="font-weight: bold; background-color: var(--clr-green)">+</button>
		</div>
		<table id="status-table">
			<thead>
			<tr>
				<th>IP</th>
				<th>Name</th>
				<th>Status</th>
				<th style="color: var(--clr-red)">X</th>
			</tr>
			<tr>
				<td colspan="4"><hr></td>
			</tr>
			</thead>

			<tbody id="status-table-body">

			</tbody>
		</table>

		<form id="add-device-form"  style="display: none;" id="status-add" onsubmit="event.preventDefault(); this.getRootNode().host.addDevice(event, this)">
			<div style="display: grid; grid-template-columns: 20% 80%;">
				<label style="text-align: right; line-height: 1.4em; margin-right: 0.5em;">IP:</label>
				<input id="status-add-ip" style="margin-left: 0px;"></input>
			</div>
			<br>
			<div style="display: grid; grid-template-columns: 20% 80%;">
				<label style="text-align: right;line-height: 1.4em; margin-right: 0.5em;">Name:</label>
				<input id="status-add-name" style="margin-left: 0px;"></input>
			</div>
			<div style="display: flex; justify-content: flex-end; margin-top: 1em;">
				<button onclick="" style="background-color: var(--clr-green)">Add Device</button>
			</div>
		</form>
	</div>
</div>
		`

		try {
			this.websocket = new WebSocket(`ws://${document.location.host}/jmod/clientWebsocket?JMOD-Source=${this.source}`);
			this.websocket.onmessage = this.websocketHandler;
		} catch(err) {
			console.error(err);
			console.log(err);
		}
	}

	async websocketHandler(event) {
		let message = event.data;
		let parsed = await JSON.parse(message);
		let table = this.shadowRoot.getElementById("status-table").querySelector("tbody");
		table.innerHTML = "";

		parsed.sort((a, b) => {
			if (a.IP < b.IP) {
				return -1;
			} 
			if (a.IP > b.IP) {
				return 1;
			}
			return 0;
		});

		for (const n in parsed) {
			let device = parsed[n];
			let row = table.insertRow();
			row.insertCell(0).innerHTML = device.IP;
			row.insertCell(1).innerHTML = device.Name;
			if (device.IsOnline) {
				row.insertCell(2).innerHTML = `<span style="color: var(--clr-green)">Online</span>`;
			} else {
				row.insertCell(2).innerHTML = `<span style="color: var(--clr-red)">Offline</span>`;
			}
			row.insertCell(3).innerHTML = `<button onclick="this.getRootNode().host.removeDevice('${device.IP}')" style='font-weight:bold; color: var(--clr-red);'>-</button>`;
		}
	}

	removeDevice(ip) {
		if (!confirm(`Do you want to delete ${ip}`)) {
			return
		}

		fetch(`/jmod/removeDevice?JMOD-Source=${this.source}`, {
			method: "POST",
			header: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ipAddress: ip})
		})
			.then(async res => {

			})
			.catch(err => {
				console.error(err);
				console.log(err);
				alert(`${this.source} Unable to remove device`);
			})
	}

	addDevice(form) {
		let ip = this.shadowRoot.getElementById("status-add-ip").value;
		let name = this.shadowRoot.getElementById("status-add-name").value;
		fetch(`/jmod/addDevice?JMOD-Source=${this.source}`, {
			method: "POST",
			header: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ipAddress: ip, name: name})
		})
			.then(async res => {
				this.showAddDeviceForm();
				console.log(await res.text());
			})
			.catch(err => {
				console.error(err);
				alert(err);
			})
	}

	showAddDeviceForm() {
		let statusTable = this.shadowRoot.getElementById("status-table");
		let formDisp = this.shadowRoot.getElementById("add-device-form");
		let formDispButton = this.shadowRoot.getElementById("button-show-form");

		console.log(statusTable.offsetHeight, statusTable.offsetWidth);


		if (formDisp.style.display == "none") {
			formDispButton.innerHTML = "x";
			formDispButton.style.backgroundColor = "var(--clr-red)";
			formDisp.style.display = "block";
			statusTable.style.display = "none";
		} else {
			formDispButton.innerHTML = "+";
			formDispButton.style.backgroundColor = "var(--clr-green)";
			formDisp.style.display = "none";
			statusTable.style.display = "table";
		}
	}
}
