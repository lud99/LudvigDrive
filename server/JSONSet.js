class JSONSet extends Set 
{
	constructor(objects)
	{
		super();

		if (objects) {
			objects.forEach(object => {
				this.addObject(JSON.parse(object));
			})
		}
	}

	addObject(object)
	{
		this.add(JSON.stringify(object));
	}

	hasObject(object) 
	{
		return this.has(JSON.stringify(object));
	}

	toJSON() 
	{
		return JSON.stringify([...this]);
	}

	toObject() 
	{
		return [...this];
	}
}

module.exports = JSONSet;