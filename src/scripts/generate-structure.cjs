const fs = require("fs");
const path = require("path");

const structure = {
    src: {
        app: {},
        assets: {},
        components: {},
        features: {
            auth: { components: {} },
            rescue: { components: {} },
            map: { components: {}, hooks: {} }, // thêm
        },
        hooks: {},
        layouts: {},
        pages: {},
        services: {},
        store: {},
        styles: {},
        utils: {},
        scripts: {},
    },
};

function createOrUpdate(base, tree) {
    Object.keys(tree).forEach((key) => {
        const dir = path.join(base, key);

        // Nếu chưa có → tạo
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
            console.log("Created:", dir);
        } else {
            console.log("Exists:", dir);
        }

        // Đệ quy sub-folder
        createOrUpdate(dir, tree[key]);
    });
}

createOrUpdate(".", structure);
