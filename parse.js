// var firstU = true;
var style_json;
var temp_path;
var set;
var current_card;
var active_field;

document.body.setAttribute("spellcheck", false);

function newCard() {
	const default_type = Object.keys(style_json.types)[0];
	const type_json = style_json.types[default_type];
	const fields = type_json.fields;
	let card = {};

	for (const field of fields) {
		const field_default = style_json.fields[field].default;
		card[field] = field_default != null ? field_default : "";
	}

	card.art = "img/noart.png";

	return card;
}

function parseStyle(style_name) {
	parsePath(`templates/${style_name}.template/`);
}

async function parsePath(template_path) {
	// let style_json = "";
	let template_style_text;
	let template_script_text;
	const items_container = document.createElement("div");
	const template_style = document.createElement('style');
	const template_script = document.getElementById("template-script");
	let fonts_style = document.getElementById("fonts-style");
	temp_path = template_path;

	await fetch(`${template_path}/style.json`)
		.then(response => response.json())
		.then(data => {
			style_json = data;
		}).catch(error => console.error('Error:', error)); // load the style json

	console.log(style_json);

	await fetch(`${template_path}/${style_json.stylesheet}`)
		.then(response => response.text())
		.then(data => {
			template_style_text = data;
		}).catch(error => console.error('Error:', error)); // load the stylesheet

	template_style.innerHTML = template_style_text;

	await fetch(`${template_path}/${style_json.script}`)
		.then(response => response.text())
		.then(data => {
			template_script_text = data;
		}).catch(error => console.error('Error:', error)); // load the stylesheet

	if (template_script_text[0] == "<") {
		template_script_text = "";
	}
	template_script.innerText = template_script_text;

	const type_dropdown = document.createElement('select'); // create a dropdown
	type_dropdown.id = "type-dropdown";
	type_dropdown.onchange = function () {
		renderCard(style_json, template_path);
	}

	const type_label = document.createElement("span");
	type_label.id = "type-label";
	type_label.className = "label";
	type_label.innerText = "Type: "

	for (const type in style_json.types) { // for each
		let opt = document.createElement('option');
		opt.value = type;
		opt.innerText = type;
		type_dropdown.appendChild(opt);
	}

	if (style_json.fonts) {
		for (const font of style_json.fonts) {
			fonts_style.innerHTML += `@font-face {\n    font-family: "${font.split(/.(t|o)tf/)[0]}";\n  src: url("${template_path}/fonts/${font}");\n}\n`;
		}
	}

	if (style_json.card) {
		for (const attr in style_json.card) {
			document.getElementById("card-fields").style[attr] = style_json.card[attr] + "px";
			document.getElementById("card-img").style[attr] = style_json.card[attr] + "px";
			document.getElementsByClassName("card")[0].style[attr] = style_json.card[attr] + "px";
		}
	}

	if (style_json.automation) {
		if (style_json.automation.insert) {
			for (const iname in style_json.automation.insert) {
				const option_ele = document.createElement("option");
				option_ele.innerText = iname;
				option_ele.value = iname;
				document.getElementById("insert-menu").appendChild(option_ele);
			}
			document.getElementById("insert-menu").onchange = function () {
				document.getElementById(active_field).innerHTML += style_json.automation.insert[document.getElementById("insert-menu").value] + " ";
			}
		}
	}

	document.getElementById("insert-menu").disabled = true;

	document.getElementById("card-fields").style.top = "0";

	const reload_card = document.createElement("button");
	reload_card.innerText = "(Debug) Re-render card";
	reload_card.className = "render-card";
	reload_card.onclick = function () {
		renderCard(style_json, template_path);
	}

	items_container.appendChild(type_label);
	items_container.appendChild(type_dropdown);
	items_container.appendChild(template_style);
	items_container.appendChild(reload_card);

	document.getElementById("card-options").appendChild(items_container);

	set = { cards: [newCard()], options: {}, currentCardIndex: 0 };
	makeSet();
	loadCard(set.cards[0], template_path);

	renderCard(style_json, template_path);
}

function attribize(str) {
	return str.replaceAll(" ", "-").toLowerCase();
}

function loadCard(card) {
	current_card = card;
	renderCard(style_json, temp_path);
}

function renderCard(style_json, template_path) {
	let val = document.getElementById("type-dropdown").value;
	updateFields(style_json.types[val].fields, template_path, current_card);
}

async function updateFields(fields, template_path, card = false) {
	document.getElementById('fields').innerHTML = '';
	document.getElementById('card-fields').innerHTML = '';
	let val = document.getElementById("type-dropdown").value;
	let type = document.getElementById("type-dropdown").value;

	if (card) {
		for (const field_name in card) {
			localStorage.setItem(field_name, card[field_name]);
		}
	}

	for (const field_name of fields) {
		let field = style_json.fields[field_name];
		if (field.type == "infix") {
			makeField(fields, field_name, style_json, template_path, type);
		}
	}
	for (const field_name of fields) {
		let field = style_json.fields[field_name];
		if (field.type != "infix") {
			makeField(fields, field_name, style_json, template_path, type);
		}
	}

	const art_ele = document.getElementById("art");
	art_ele.className = filter(style_json.art.class, true);
	if (style_json.art.position) {
		const position_filtered = filter(style_json.art.position);
		let pos_split = position_filtered.split(";");
		art_ele.style.top = filter(pos_split[0]) + "px";
		art_ele.style.left = filter(pos_split[1]) + "px";
		art_ele.style.height = filter(pos_split[2]) + "px";
		art_ele.style.width = filter(pos_split[3]) + "px";
	}

	for (const over in style_json.art.override) {
		if (over == type) {
			art_ele.className = filter(style_json.art.override[over].class, true);
		}
	}

	document.getElementById("card-img").src = template_path + filter(style_json.types[val].url, true);
	document.getElementById("art").src = card.art;

	makeSet();
}

function downloadImage(file_extension) {
	writeImageFile(document.getElementById(filter(style_json.card.name_field)).innerText + "." + file_extension);
}

function writeImageFile(fn) {
	const card_ele = document.getElementsByClassName("card")[0];
	html2canvas(card_ele, { width: style_json.card.width, height: style_json.card.height, useCORS: true, taintTest: false, allowTaint: false }).then(function (canvas) {
		var width = canvas.width;
		var height = canvas.height;
		var context = canvas.getContext('2d');
		var imageData = context.getImageData(0, 0, width, height).data;
		var outputCanvas = document.createElement('canvas');
		var outputContext = outputCanvas.getContext('2d');
		outputCanvas.width = width;
		outputCanvas.height = height;
		var idata = outputContext.createImageData(width, height);
		idata.data.set(imageData);
		outputContext.putImageData(idata, 0, 0);
		downloadURI(outputCanvas.toDataURL(), fn);
	});
}

function downloadURI(uri, name) {
	var link = document.createElement("a");
	link.download = name;
	link.href = uri;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	delete link;
}

async function makeField(fields, field_name, style_json, template_path, type) {
	let field = style_json.fields[field_name];
	let overrides = field.override;
	if (overrides) {
		for (const over in overrides) {
			if (type == over) {
				field = overrides[over];
				break;
			}
		}
	}
	let field_element;
	let field_default;
	switch (field.view) {
		case "dropdown":
			field_default = filter(localStorage.getItem(field_name));
			field_default = field_default[0].toUpperCase() + field_default.substring(1);
			field_element = document.createElement('select');
			if (field_default) {
				let d_opt_ele = document.createElement('option');
				d_opt_ele.value = field_default;
				d_opt_ele.innerText = field_default;
				field_element.appendChild(d_opt_ele);
			}
			for (let opt of field.options) {
				if (opt == field_default) {
					continue;
				}
				let opt_ele = document.createElement('option');
				opt_ele.value = opt;
				opt_ele.innerText = opt;
				field_element.appendChild(opt_ele);
			}
			field_element.onchange = function () {
				localStorage.setItem(field_name, document.getElementById(field_name).value);
				current_card[field_name] = document.getElementById(field_name).value;
				renderCard(style_json, template_path);
				updateFields(fields, template_path, current_card);
			}
			break;
		case "card-text":
			field_default = localStorage.getItem(field_name);
			if (field_default == null) field_default = filter(field.default);
			field_element = document.createElement('span');
			field_element.contentEditable = "true";
			field_element.innerText = field_default;
			field_element.onfocus = function () {
				active_field = field_name;
				document.getElementById("insert-menu").disabled = false;
			}
			field_element.onblur = function () {

				// document.getElementById("insert-menu").disabled = true;
				localStorage.setItem(field_name, field_element.innerText);
				current_card[field_name] = document.getElementById(field_name).innerText;
				renderCard(style_json, template_path);
			}
			break;
		case "card-sym":
			field_default = localStorage.getItem(field_name);
			if (field_default == null) field_default = filter(field.default);
			p_aa = await parseSymbolFont(localStorage.getItem(field_name), field['symbol-font'], style_json, template_path);
			aa = p_aa.text;
			waa = p_aa.width;
			if (document.getElementById(field_name)) return;
			if (field['keep-text']) {
				field_element = document.createElement('div');
				field_element.contentEditable = "true";
				field_element.innerHTML = aa;

				// field_element_modify.style.zIndex = "-2";
				field_element.onfocus = function () {
					active_field = field_name;
					document.getElementById("insert-menu").disabled = false;
				}
				field_element.addEventListener("blur", async function (event) {
					// document.getElementById("insert-menu").disabled = true;
					symbolFontModify(field_name, field_element, field, style_json, template_path);
					renderCard(style_json, template_path);
				});
				field_element.style.color = "";
				break;
			} else {
				field_element = document.createElement('div');
				field_element_modify = document.createElement('span');
				field_element_modify.contentEditable = "true";
				field_element_modify.id = field_name + "-modify";
				console.log(aa, p_aa);
				field_element.innerHTML = aa;
				field_element_modify.innerText = filter(field.default);
				field_element_modify.style.top = "0px";
				field_element_modify.style.position = "absolute";
				field_element_modify.style.direction = 'ltr';
				field_element_modify.style.fontSize = waa;
				// field_element_modify.style.zIndex = "-2";
				field_element.style.color = "rgba(0,0,0,0)";
				field_element.appendChild(field_element_modify);
				field_element_modify.addEventListener("blur", async function () {
					await symbolFontModify(field_name, field_element, field, style_json, template_path);
				});
				field_element.onclick = function () {
					field_element_modify.focus();
				}
				break;
			}
		case "checkbox":
			field_element = document.createElement('input');
			field_element.type = "checkbox";
			field_default = localStorage.getItem(field_name);
			field_element.checked = (field_default == "true");
			field_element.onchange = function () {
				localStorage.setItem(field_name, document.getElementById(field_name).checked);
				current_card[field_name] = document.getElementById(field_name).checked;
				renderCard(style_json, template_path);
				updateFields(fields, template_path, current_card);
			}
			break;
		case "input":
			field_element = document.createElement('input');
			field_element.type = field.input_type ? field.input_type : "text";
			field_default = localStorage.getItem(field_name);
			if (field_default) {
				field_element.value = field_default;
			} else {
				field_element.value = field.default ? filter(field.default) : "";
			}
			field_element.onchange = function () {
				localStorage.setItem(field_name, document.getElementById(field_name).value);
				current_card[field_name] = document.getElementById(field_name).value;
				renderCard(style_json, template_path);
				// updateFields(fields, template_path);
			}
			break;
		case "none":
			field_element = document.createElement("div");
			field_element.style.display = "none";
			break;
	}
	if (field.default != null && localStorage.getItem(field_name) == null) {
		localStorage.setItem(field_name, filter(field.default))

	}
	if (field.type == "overlay" && (localStorage.getItem(field_name) == "true" || field.view != "checkbox")) {
		overlay = document.createElement('img');
		overlay.className = field.img.class;
		overlay.src = template_path + filter(field.url, true);
		// console.log(filter(field.url), "filtered");
		overlay.style.position = "absolute";
		overlay.style.top = field.img.top ? filter(field.img.top) + "px" : "0";
		overlay.style.left = field.img.left ? filter(field.img.left) + "px" : "0";
		overlay.style.width = field.img.width ? filter(field.img.width) + "px" : "100%";
		overlay.style.height = field.img.height ? filter(field.img.height) + "px" : "100%";
		overlay.style.pointerEvents = "none";
		if (field.img.style) {
			for (const style_option in field.img.style) {
				overlay.style[style_option] = filter(field.img.style[style_option]);
			}
		}
		document.getElementById(field.img.loc).appendChild(overlay);
	}
	if (field.label) {
		const field_label = document.createElement('span');
		const field_text = field.label === true ? field_name : field.label;
		field_label.innerText = field_text + ": ";
		document.getElementById('fields').appendChild(field_label);
	}

	field_element.className = filter(field.class, true);
	field_element.id = field_name;

	if (field.position) {
		const position_filtered = filter(field.position);
		let pos_split = position_filtered.split(";");
		field_element.style.top = filter(pos_split[0]) + "px";
		field_element.style.left = filter(pos_split[1]) + "px";
		field_element.style.height = filter(pos_split[2]) + "px";
		field_element.style.width = filter(pos_split[3]) + "px";
		field_element.style.position = "absolute";
	}
	if (field.font) {
		field_element.style.fontFamily = filter(field.font.family);
		field_element.style.fontWeight = filter(field.font.weight);
		field_element.style.lineHeight = filter(field.font['line-height']) + "px";
		field_element.style.fontSize = filter(field.font.size) + "px";
		field_element.style.color = filter(field.font.color);
	}
	if (field.style) {
		for (const style_option in field.style) {
			field_element.style[style_option] = filter(field.style[style_option]);
		}
	}
	if (field.text) {
		field_element.innerText = filter((field.text, style_json), true, false);
	}
	document.getElementById(field.loc).appendChild(field_element);
	return;
}

function makeSet() {
	document.getElementById("cards").innerHTML = '';
	for (const card of set.cards) {
		document.getElementById("cards").appendChild(makeCard(card));
	}
}

function makeCard(card) {
	const name_field = style_json.card.name_field;

	const card_container = document.createElement("div");
	card_container.className = "card-container";

	const card_name = document.createElement("span");
	card_name.className = "card-name";
	card_name.innerText = card[style_json.card.name_field];

	card_container.appendChild(card_name);

	card_container.onclick = function () {
		loadCard(card);
	}

	if (!style_json.card.display_fields)
		return card_container;

	for (const display_field of style_json.card.display_fields) {
		const field_ele = document.createElement("span");
		field_ele.className = "card-field-display";
		field_ele.innerText = set.cards[set.currentCardIndex][display_field];

		card_container.appendChild(field_ele);
	}

	return card_container;
}

async function symbolFontModify(field_name, field_element, field, style_json, template_path) {
	if (field['keep-text']) {
		localStorage.setItem(field_name, document.getElementById(field_name).innerHTML.replaceAll("\n", "<br>"));
		current_card[field_name] = document.getElementById(field_name).innerHTML.replaceAll("\n", "<br>");
	} else {
		localStorage.setItem(field_name, document.getElementById(field_name + "-modify").innerHTML);
		current_card[field_name] = document.getElementById(field_name + "-modify").innerHTML;
	}
	makeSet();
	p_aa = await parseSymbolFont(localStorage.getItem(field_name), field['symbol-font'], style_json, template_path);
	aa = p_aa.text;
	waa = p_aa.width;
	if (field['keep-text']) {
		field_element.contentEditable = "true";
		field_element.innerHTML = aa;
		// field_element_modify.style.zIndex = "-2";
		field_element.onfocus = function () {
			active_field = field_name;
			document.getElementById("insert-menu").disabled = false;
		}
		field_element.addEventListener("blur", function (event) {
			if (event.key == "backspace")
				localStorage.setItem(field_name, "");
			// document.getElementById("insert-menu").disabled = true;
			symbolFontModify(field_name, field_element, field, style_json, template_path);
		});
		field_element.style.color = "";
	} else {
		field_element_modify = document.createElement('span');
		field_element_modify.contentEditable = "true";
		field_element_modify.id = field_name + "-modify";
		field_element.innerHTML = aa;
		field_element_modify.innerText = localStorage.getItem(field_name);
		field_element_modify.style.top = "0px";
		field_element_modify.style.position = "absolute";
		field_element_modify.style.direction = 'ltr';
		field_element_modify.style.fontSize = waa;
		// field_element_modify.style.zIndex = "-2";
		field_element.style.color = "rgba(0,0,0,0)";
		field_element.appendChild(field_element_modify);
		field_element.onfocus = function () {
			active_field = field_name;
			document.getElementById("insert-menu").disabled = false;

		}
		field_element_modify.addEventListener("keyup", async function (event) {
			if (event.key == "backspace")
				localStorage.setItem(field_name, "");
			document.getElementById("insert-menu").disabled = true;
			await symbolFontModify(field_name, field_element, field, style_json, template_path);
		});
		field_element.onclick = function () {
			field_element_modify.focus();
		}
		field_element_modify.focus();
	}
}

async function parseSymbolFont(str, sf_path, style_json, template_path) {


	let symbol_font = {};

	await fetch(`${template_path}${sf_path}/symbol-font.json`)
		.then(response => response.json())
		.then(data => {
			symbol_font = data;
		}).catch(error => console.error('Error:', error)); // load the style json'


	sf_style = `max-height: ${symbol_font.size};`;

	let newstr = str;
	for (const match in symbol_font.double) {
		newstr = newstr.replaceAll(match, `[[${match}]]`);
	}
	for (const match in symbol_font.single) {
		newstr = newstr.replaceAll(match, `[[${match}]]`);
	}
	for (const match in symbol_font.double) {
		newstr = newstr.replaceAll(`[[${match}]]`, imgtag(symbol_font.double[match], template_path + sf_path, sf_style))
	}
	for (const match in symbol_font.single) {
		newstr = newstr.replaceAll(`[[${match}]]`, imgtag(symbol_font.single[match], template_path + sf_path, sf_style))
	}

	if (symbol_font.direction == "rtl") {
		newstr = `<div style="direction: ltr; width: fit-content; pointer-events: none;">${newstr}</div>`;
	}

	return { text: newstr, width: symbol_font.size };
}

function imgtag(src, template_path, styling) {
	return `<img src="${template_path}/${src}" style="${styling}">`;
}

function parseConst(str, consts_) {
	none_to_parse = true;
	for (const style_const in consts_) {
		if (str.includes(`!${style_const}`)) {
			none_to_parse = false;
			str = str.replaceAll(`!${style_const}`, consts_[style_const]);
		}
	}

	if (none_to_parse)
		return str;

	return parseConst(str, consts_);
}

function filter(str, use_fields = true, lowercase = true) {
	// alert("filtering");
	if (!str) {
		return "";
	}

	let newstr = str.replaceAll("{type}", document.getElementById("type-dropdown").value);
	let type = document.getElementById("type-dropdown").value;
	let expr = "";
	let inexpr = false;

	while (true) {
		let found_all = true;
		if (use_fields) {
			newstr = parseConst(newstr, style_json.consts);
			if (newstr.includes("<") && newstr.includes(">")) {
				found_all = false;
				let depth = 0;
				for (const char of newstr) {
					if (char == "<") {
						inexpr = true;
						depth += 1;
					}
					if (inexpr) {
						if (char == ">") {
							depth -= 1;
							expr += ">";
							if (depth != 0) {
								continue;
							};
							let expr_res = parseExpr(expr.replaceAll(">", "").replaceAll("<", ""))
							if (expr_res == "stop")
								newstr = newstr.split(">")[0].split("<")[0];
							newstr = newstr.replace(expr, expr_res, style_json);
							expr = "";
							inexpr = false;
						} else {
							expr += char;
						}
					}
				}
			}

			for (const field of style_json.types[type].fields) {
				let val = document.getElementById(field);
				if (val == null) {
					val = style_json.fields[field].default;
				} else {
					val = val.value;
				}
				if (newstr.includes(`{${field}}`) || newstr.includes(`[${field}]`)) {
					newstr = newstr.replaceAll(`{${field}}`, val);
					newstr = newstr.replaceAll(`[${field}]`, localStorage.getItem(field));
					found_all = false;
				}
			}
			if (newstr.includes("{type}")) {
				newstr = newstr.replaceAll("{type}", document.getElementById("type-dropdown").value);
				found_all = false;
			}
		}



		if (found_all) {
			break;
		}
	}

	if (lowercase) {
		return newstr.toLowerCase();
	}
	return newstr;
}

document.getElementById("file-menu").addEventListener("change", function () {
	const option = document.getElementById("file-menu").value;

	if (option.includes("export")) {
		downloadImage(option.split("-")[1]);
	} else if (option == "save-set") {
		saveSet();
	} else if (option == "open-set") {
		openSet();
	}

	document.getElementById("file-menu").value = "default";
});

document.getElementById("cards-menu").addEventListener("change", function () {
	const option = document.getElementById("cards-menu").value;

	if (option == "new-card") {
		set.cards.push(newCard());
		set.currentCardIndex += 1;
		loadCard(set.cards[set.currentCardIndex]);
		makeSet();
	}

	document.getElementById("cards-menu").value = "default";
});

document.getElementById("add-btn").addEventListener("click", function () {
	set.cards.push(newCard());
	set.currentCardIndex += 1;
	loadCard(set.cards[set.currentCardIndex]);
	makeSet();
});

function saveSet() {
	writeTextFile("set.json", JSON.stringify(set));
}

function writeTextFile(fn, text) {
	downloadURI("data:text;charset=utf-8," + encodeURIComponent(text), fn)
}

function openSet() {
	const file_input = document.createElement("input");
	file_input.type = "file";
	file_input.onchange = openSetHandler;
	file_input.click();
}

function artHandler(event) {
	var selectedFile = event.target.files[0];
	var reader = new FileReader();

	var imgtag = document.getElementById("art");
	imgtag.title = selectedFile.name;
	imgtag.crossOrigin = "anonymous";

	reader.onload = function (event) {
		imgtag.src = event.target.result;
		current_card.art = event.target.result;
	};

	reader.readAsDataURL(selectedFile);
}

function openSetHandler(event) {
	var selectedFile = event.target.files[0];
	var reader = new FileReader();

	reader.onload = function (event) {
		set = JSON.parse(event.target.result);
		loadCard(set.cards[0]);
	};

	reader.readAsText(selectedFile);
}


function parseExpr(expr, style_json) {
	console.log("parsing", expr);
	const tokens = expr.split(" ");
	let tracker = [];
	let info = {};
	let out = "";
	let handle_token = "default";
	for (const token of tokens) {
		switch (handle_token) {
			case "default":
				if (token == "if") {
					handle_token = "if";
					info.if_depth = 1;
					tracker = []
				}
				break;
			case "if":
				if (token == "if") info.if_depth += 1;
				if (token == "end") {
					info.if_depth -= 1;
					if (info.if_depth == 0) {
						console.log(tracker);
						out += parseIf(tracker, style_json);
						info.if_depth = 0;
						tracker = [];
						handle_token = "default";
					}
				} else {
					tracker.push(token);
				}
				break;
		}
	}
	console.log("result", out);
	return out;
}

function parseIf(tokens) {
	// tokens should look like [COND, then, VAL, else, VAL]
	let condition = [];
	let val1 = "";
	let val2 = "";
	let mode = "cond";
	let cond_bool;
	for (const token of tokens) {
		if (mode == "cond") {
			if (token == "then") {
				cond_bool = parseCond(condition);
				mode = "val1"
			} else {
				condition.push(token);
			}
		} else if (mode == "val1") {
			if (token == "else") {
				mode = "val2"
			} else {
				val1 = filterToken(token);
			}
		} else if (mode == "val2") {
			val2 = filterToken(token);
		}
	}

	console.log(`if ${condition} then ${val1} else ${val2} end`);

	if (cond_bool) {
		return val1;
	} else {
		return val2;
	}
}

function strNull(s) {
	if (s == undefined || s == null)
		return "";

	return s;
}

function filterToken(token) {
	if (token[0] == ".") {
		let t = token.split('.')[1]
		if (t == "type") {
			return document.getElementById('type-dropdown').value.toLowerCase();
		} else {
			return localStorage.getItem(t).toLowerCase();
		}
	} else if (token[0] == ",") {
		let t = token.split(',')[1]
		if (t == "type") {
			return document.getElementById('type-dropdown').value.toLowerCase();
		} else {
			let ele = document.getElementById(t);
			if (ele.tagName == "SELECT") {
				return ele.value.toLowerCase();
			} else if (ele.tagName == "INPUT" && ele.type == "checkbox") {
				return ele.checked;
			} else if (ele.tagName == "SPAN") {
				return ele.innerText.toLowerCase();
			} else {
				return localStorage.getItem(t).toLowerCase();
			}
		}
	} else if (token == "nil" || token == "''") {
		return "";
	}
	else {
		return token;
	}
}

function parseCond(cond) {
	let v1 = filterToken(cond[0]);
	let op = cond[1];
	let v2 = filterToken(cond[2]);
	if (op == "=") {
		return v1 == v2;
	} else if (op == "$") {
		return v1.includes(v2);
	} else {
		return false;
	}
}