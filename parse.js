// var firstU = true;

function parseStyle(style_name) {
    parsePath(`templates/${style_name}.template/`);
}

async function parsePath(template_path) {
    let style_json = "";
    let template_style_text;
    const items_container = document.createElement("div");
    const template_style = document.createElement('style');
    let fonts_style = document.getElementById("fonts-style");

    await fetch(`${template_path}/style.json`)
        .then(response => response.json())
        .then(data => {
            style_json = data; 
    }).catch(error => console.error('Error:', error)); // load the style json

    await fetch(`${template_path}/${style_json.stylesheet}`)
        .then(response => response.text())
        .then(data => {
            template_style_text = data; 
    }).catch(error => console.error('Error:', error)); // load the style json

    template_style.innerHTML = template_style_text;    

    const type_dropdown = document.createElement('select'); // create a dropdown
    type_dropdown.id = "type-dropdown";
    type_dropdown.onchange = function() {
        updateCard(style_json, template_path);
    }

    for (const type in style_json.types) { // for each
        let opt = document.createElement('option');
        opt.value = type ;
        opt.innerText = type;
        type_dropdown.appendChild(opt);
    }
    if (style_json.fonts) {
        for (const font of style_json.fonts) {
            fonts_style.innerHTML += `@font-face {\n    font-family: "${font.split(/.(t|o)tf/)[0]}";\n  src: url("${template_path}/fonts/${font}");\n}\n`;
        }
    }
    items_container.appendChild(type_dropdown);
    items_container.appendChild(template_style);

    document.getElementById("card-options").appendChild(items_container);

    updateCard(style_json, template_path);
}

function attribize(str) {
    return str.replaceAll(" ", "-").toLowerCase();
}

async function updateCard(style_json, template_path) {
    let val = document.getElementById("type-dropdown").value;
    updateFields(style_json.types[val].fields, style_json, template_path);
    console.log("DONE FIELDS");
}

async function updateFields(fields, style_json, template_path) {
    document.getElementById('fields').innerHTML = '';
    document.getElementById('card-fields').innerHTML = '';
    let val = document.getElementById("type-dropdown").value;
    let type = document.getElementById("type-dropdown").value;
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

    document.getElementById("art").className = filter(style_json.art.class, style_json, true);
    for (const over in style_json.art.override) {
        if (over == type) {
            document.getElementById("art").className = filter(style_json.art.override[over].class, style_json, true);
        }
    }
    document.getElementById("card-img").src = template_path + filter(style_json.types[val].url, style_json, true);
    console.log("card-img", template_path + filter(style_json.types[val].url, style_json, true));
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
            field_default = localStorage.getItem(field_name);
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
            field_element.onchange = function() {
                localStorage.setItem(field_name, document.getElementById(field_name).value);
                updateCard(style_json, template_path);
                updateFields(fields, style_json, template_path);
            }
            break;
        case "card-text":
            field_default = localStorage.getItem(field_name);
            if (field_default == null) field_default = field.default;
            field_element = document.createElement('span');
            field_element.contentEditable = "true";
            field_element.innerText = field_default;
            field_element.onblur = function() {
                localStorage.setItem(field_name, field_element.innerText);
                updateCard(style_json, template_path);
            }
            break;
        case "card-sym":
            field_default = localStorage.getItem(field_name);
            if (field_default == null) field_default = field.default;
            aa = await parseSymbolFont(field_default, field['symbol-font'], style_json, template_path);
            if (document.getElementById(field_name)) return;
            if (field['keep-text']) {
                field_element = document.createElement('div');
                field_element.contentEditable = "true";
                field_element.innerHTML = aa;
                // field_element_modify.style.zIndex = "-2";
                field_element.addEventListener("blur", async function() {
                    await symbolFontModify(field_name, field_element, field, style_json, template_path);
                });
                field_element.style.color = "";
                break;
            } else {
                field_element = document.createElement('div');
                field_element_modify = document.createElement('span');
                field_element_modify.contentEditable = "true";
                field_element_modify.id = field_name + "-modify";
                field_element.innerHTML = aa;
                field_element_modify.innerText = field.default;
                field_element_modify.style.top = "0px";
                field_element_modify.style.position = "absolute";
                field_element_modify.style.direction = 'ltr';
                // field_element_modify.style.zIndex = "-2";
                field_element.style.color = "rgba(0,0,0,0)";
                field_element.appendChild(field_element_modify);
                field_element_modify.addEventListener("blur", async function() {
                    await symbolFontModify(field_name, field_element, field, style_json, template_path);
                });
                break;
            }
        case "checkbox":
            field_element = document.createElement('input');
            field_element.type = "checkbox";
            field_default = localStorage.getItem(field_name);
            field_element.checked = (field_default == "true");
            field_element.onchange = function() {
                localStorage.setItem(field_name, document.getElementById(field_name).checked);
                updateCard(style_json, template_path);
                updateFields(fields, style_json, template_path);
            }
            break;
        case "none":
            break;
    }
    if (field.default != null && localStorage.getItem(field_name) == null) {
        localStorage.setItem(field_name, field.default)
    }
    if (field.type == "overlay" && (localStorage.getItem(field_name) == "true" || field.view != "checkbox")) {
        overlay = document.createElement('img');
        overlay.className = field.img.class;
        overlay.src = template_path + filter(field.url, style_json, true);
        if (field.img.style) {
            for (const style_option in field.img.style) {
                overlay.style[style_option] = filter(field.img.style[style_option], style_json);
            }
        }
        document.getElementById(field.img.loc).appendChild(overlay);
    }
    if (field.label) {
        const field_label = document.createElement('span');
        field_label.innerText = field_name;
        document.getElementById('fields').appendChild(field_label);
    }

    field_element.className = filter(field.class, style_json, true);
    field_element.id = field_name;

    if (field.position) {
        let pos_split = field.position.split(";");
        field_element.style.top = filter(pos_split[0], style_json) + "px";
        field_element.style.left = filter(pos_split[1], style_json) + "px";
        field_element.style.height = filter(pos_split[2], style_json) + "px";
        field_element.style.width = filter(pos_split[3], style_json) + "px";
        field_element.style.position = "absolute";
    }
    if (field.font) {
        field_element.style.fontFamily = filter(field.font.family, style_json);
        field_element.style.fontWeight = filter(field.font.weight, style_json);
        field_element.style.lineHeight = filter(field.font['line-height'], style_json) + "px";
        field_element.style.fontSize = filter(field.font.size, style_json) + "px";
    }
    if (field.style) {
        for (const style_option in field.style) {
            field_element.style[style_option] = filter(field.style[style_option], style_json);
        }
    }
    if (field.text) {
        field_element.innerText = filter(field.text, style_json, true, false);
    }
    document.getElementById(field.loc).appendChild(field_element);
    return;
}

async function symbolFontModify(field_name, field_element, field, style_json, template_path) {
    if (field['keep-text']) { 
        localStorage.setItem(field_name, document.getElementById(field_name).innerHTML.replaceAll("\n", "<br>"));
    } else {
        localStorage.setItem(field_name, document.getElementById(field_name + "-modify").innerHTML.replaceAll("\n", "<br>"));
    }
    aa = await parseSymbolFont(localStorage.getItem(field_name), field['symbol-font'], style_json, template_path);
    if (field['keep-text']) {
        field_element.contentEditable = "true";
        field_element.innerHTML = aa;
        // field_element_modify.style.zIndex = "-2";
        field_element.addEventListener("blur", function() {
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
        // field_element_modify.style.zIndex = "-2";
        field_element.style.color = "rgba(0,0,0,0)";
        field_element.appendChild(field_element_modify);
        field_element_modify.addEventListener("blur", async function() {
            await symbolFontModify(field_name, field_element, field, style_json, template_path);
        });
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
        return `<div style="direction: ltr; width: fit-content; pointer-events: none;">${newstr}</div>`;
    }

    return newstr;
}

function imgtag(src, template_path, styling) {
    return `<img src="${template_path}/${src}" style="${styling}">`;
}

function filter(str, style_json, use_fields = true, lowercase = true) {
    if (!str) {
        return;
    }

    let newstr = str.replaceAll("{type}", document.getElementById("type-dropdown").value);
    let type = document.getElementById("type-dropdown").value;  
    let expr = "";
    let inexpr = false;

    if (newstr.includes("<") && newstr.includes(">")) {
        console.log('expr');
        for (const char of newstr) {
            if (char == "<") {
                inexpr = true;
                continue;
            }
            if (inexpr) {
                if (char == ">") {
                    newstr = newstr.replace("<" + expr + ">", parseExpr(expr, style_json));
                    console.log("done expr", newstr);
                    expr = "";
                    inexpr = false;
                } else {
                    expr += char;
                }
            }
        }
    }

    if (use_fields) {
        for (const field of style_json.types[type].fields) {
            console.log(field);
            let val = document.getElementById(field);
            if (val == null) {
                val = style_json.fields[field].default;
            } else {
                val = val.value;
            }
            newstr = newstr.replaceAll(`{${field}}`, val);
            newstr = newstr.replaceAll(`[${field}]`, localStorage.getItem(field));
        }
    }
 
    if (lowercase) {
        return newstr.toLowerCase();
    }
    return newstr;
}

function parseExpr(expr, style_json) {
    const tokens = expr.split(" ");
    console.log("parsing expr", tokens);    
    let tracker = [];
    let out = "";
    let handle_token = "default";
    for (const token of tokens) {
        switch (handle_token) {
            case "default":
                if (token == "if") {
                    handle_token = "if";
                    tracker = []
                }
            break;
            case "if":
                if (token == "end") {
                    out += parseIf(tracker, style_json);
                } else {
                    tracker.push(token);
                }
                break;
        }
    }

    console.log("parsed", out);
    return out;
}

function parseIf(tokens) {
    // tokens should look like [COND, then, VAL, else, VAL]
    console.log("parsing if", tokens); 
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

    console.log(val1, val2, cond_bool);
    if (cond_bool) {
        return val1;
    } else {
        return val2;
    }
}

function filterToken(token) {
    if (token[0] == ".") {
        let t = token.split('.')[1]
        if (t == "type") {
            return document.getElementById('type-dropdown').value.toLowerCase();
        } else {
            console.log(t);
            return localStorage.getItem(t).toLowerCase();
        }
    } else if (token[0] == ",") {
        let t = token.split(',')[1]
        if (t == "type") {
            return document.getElementById('type-dropdown').value.toLowerCase();
        } else {
            console.log(t);
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
    }else {
        return token;
    }
}

function parseCond(cond) {
    console.log("parsing cond", cond);
    let v1 = filterToken(cond[0]);
    let op = cond[1];
    let v2 = filterToken(cond[2]);
    console.log(v1, op, v2);
    if (op == "=") {
        return v1 == v2;
    } else if (op == "$") {
        return v1.includes(v2);
    } else {
        return false;
    }
}