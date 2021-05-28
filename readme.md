# LiteElement

An extremely lightweight (About 1KB gzipped) JavaScript web component library making it easy to create HTML user interface components:

```javascript
class InventoryList extends LiteElement {
	addItem() {
        // this.items is a class property created by id="items" in the html.
		this.items.append(this.createEl(`
			<tr oninput="this.updateResult()">
				<td><input name="name"></td>
				<td><input name="qty" type="number"></td>
				<td>
					<button onclick="el.closest('tr').remove(); this.updateResult()">X</button>
				</td>
			</tr>
		`));
		this.updateResult();
	}

	updateResult() { // Create an array of objects, basted on input field names.
		let values = Array.from(this.items.children).map(LiteElement.getValues);
		this.result.innerHTML = JSON.stringify(values, null, 4);
	}
}
InventoryList.html = `
    <inventory-list>
        <button onclick="this.addItem()">Add Item</button>
        <table id="items">
            <tr><th>Name</th><th>Qty</th></tr>
		</table>
		<div id="result" style="white-space: pre"></div>
    </inventory-list>`;

document.body.append(new InventoryList());
```

Features:

- No custom build steps and zero dependencie, not even Node..  Just include LiteElement.js or LiteElement.min.js.
- Doesn't take over your whole project.  Place it within standard DOM nodes only where you need it.
- Uses standard, native html and JavaScript.  No need to learn another template or markup language.
- Use all standard DOM operations such as `append()`, `remove()` and `childNodes` to view and manipulate child nodes.
- Can use shadow DOM, events, and slots.
- MIT license.  Free for commercial use.

Notice that LiteElement does not support data binding.  This is done manually via simple helper functions, for improved performance.

## Minimal Example

In this minimal example, we make a new class called Hello and set its html.  Note that we use an `l-` prefix for the tag name, since HTML requires all custom web component names to include a dash.

```javascript
import LiteElement from './LiteElement.js';

class Hello extends LiteElement {}
Hello.html = `<l-hello>Hello LiteElement!</l-hello>`;

document.body.append(new Hello());
```

Note we can also instantiate the element directly in html:

```html
<l-hello></l-hello>
```

Subsequent examples omit the  `import LiteElement` code for brevity.

## Ids

Any element in the html with an id is automatically bound to a property with the same name on the class instance:

```javascript
class Car extends LiteElement {}
Car.html = `
    <l-car>
        <input id="driver" value="Vermin Supreme">
    </l-car>`;

var car = new Car();
console.log(car.driver.value);     // Vermin Supreme
car.driver.value = 'Chuck Norris'; // Puts text in input box.
car.driver = 3; // Error, property is read-only.
```

## Events

Events can be used via the conventional `on` attributes.  The event code is given three variables implicitly:

1. `this` Refers to the parent LiteElement.
2. `event` Is the event object.
3. `el` Is the HTML Element where the attribute is present.

```javascript
class Car extends LiteElement {
	honk(event, el) {
    	console.log(`${event.type} happened on ${el.tagName}.`);
    }
}
Car.html = `
    <l-car>
        <button onclick="this.honk(event, el)">
    </l-car>`;

var car = new Car();
```

In the example above, clicking the button will print `click happened on BUTTON.`

## Shadow DOM

If the `shadow` attribute is present on a LiteElement or any of its children, any child nodes will be created as as [ShadowDOM](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM).  This allows styles to be embedded that only apply to the html of the LiteElement.  The *:host* selector is used to style the element itself, per the ShadowDOM specification.

```javascript
class FancyText extends LiteElement {}
FancyText.html = `
	<fancy-text>
		<style>
			:host { border: 10px dashed red }
			p { text-shadow: 0 0 5px orange }
		</style>
		<p>Fancy text!</p>
	</fancy-text>`;
```

## Nesting

LiteElements can also be embedded within the html of other LiteElements :

```javascript
class Wheel extends LiteElements  {}
Wheel.html = '<l-wheel>O</l-wheel>';

class Car extends LiteElements  {}
Car.html = `
    <l-car>
        <l-wheel></l-wheel>
        <l-wheel></l-wheel>
        <l-wheel></l-wheel>
        <l-wheel></l-wheel>
    </l-car>`;
```

## Slots

[Slots](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/slot) are a placeholder inside a LiteElement that you can fill with your own HTML nodes.

```html
<script>
    class Car extends LiteElement {}
    Car.html = `
        <div>
            <div>Engine</div>
            <slot></slot>
        </div>`;
</script>

<l-car>
    <div>wheel</div>
    <div>wheel</div>
    <div>wheel</div>
    <div>wheel</div>
</l-car>
```

Named slots allow using multiple placeholders and assigning your own html nodes as specified.

```html
<script>
    class Car extends LiteElement {}
    Car.html = `
        <div>
            <slot name="engine"></slot>
            <slot name="wheels"></slot>
        </div>`;
</script>

<l-car>
    <div slot="engine">3.1L V6</div>
    <div slot="wheels">        
        <div>wheel</div>
        <div>wheel</div>
        <div>wheel</div>
        <div>wheel</div>
    </div>
</l-car>
```

## Helper Functions

### createEl(html:string, trim:boolean=true) : HTMLElement|Node

This function will convert any html to DOM nodes, and any event attributes will behave as if they were always part of the class.  See the first example above which demonstrates its use to create rows to add in the Inventory List example.

### static getValues(el:HTMLElement) : object

Find all elements with a name attribute within `el` and return them as an object that maps those names to their value properties.  This is useful for getting all form field names and values.  The Inventory List example above shows its use.


