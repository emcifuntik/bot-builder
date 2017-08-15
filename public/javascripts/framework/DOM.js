class ID {
    get(target, name) {
        return target.getElementById(name);
    }
}

class Class {
    get(target, name) {
        return target.getElementsByClassName(name);
    }
}

class Name {
    get(target, name) {
        return target.getElementsByName(name);
    }
}

class Tag {
    get(target, name) {
        return target.getElementsByTagName(name);
    }
}

class TagNS {
    get(target, name) {
        return target.getElementsByTagName(name);
    }
}

class DOM {
    constructor(doc) {
        this.id = new Proxy(doc, new ID());
        this.class = new Proxy(doc, new Class());
        this.name = new Proxy(doc, new Name());
        this.tag = new Proxy(doc, new Tag());
        this.tagNs = new Proxy(doc, new TagNS());
    }
}

let dom = new DOM(document);