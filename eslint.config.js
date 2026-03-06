export default [
    {
        files: ["client/js/**/*.js"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                // Browser globals
                window: "readonly",
                document: "readonly",
                navigator: "readonly",
                localStorage: "readonly",
                performance: "readonly",
                fetch: "readonly",
                console: "readonly",
                setTimeout: "readonly",
                setInterval: "readonly",
                clearTimeout: "readonly",
                clearInterval: "readonly",
                requestAnimationFrame: "readonly",
                cancelAnimationFrame: "readonly",
                Image: "readonly",
                Audio: "readonly",
                Worker: "readonly",
                HTMLCanvasElement: "readonly",
                XMLHttpRequest: "readonly",
                Event: "readonly",
                // Web Worker globals (for mapworker.js)
                self: "readonly",
                postMessage: "readonly",
                importScripts: "readonly",
            },
        },
        rules: {
            // Catch undeclared references (would have caught the _ bug)
            "no-undef": "error",
            // Enforce modernization — no var
            "no-var": "error",
            // Catch unused variables (ignore function params starting with _)
            "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
            // Catch common bugs
            "no-dupe-keys": "error",
            "no-duplicate-case": "error",
            "no-unreachable": "error",
            "no-constant-condition": "warn",
            "no-self-compare": "error",
            "eqeqeq": ["warn", "smart"],
            "no-redeclare": "error",
        },
    },
    {
        // Server-side code in client/js/server/ uses same config
        files: ["client/js/server/**/*.js"],
        languageOptions: {
            sourceType: "module",
        },
    },
    {
        // Test files use CommonJS
        files: ["client/tests/**/*.js", "client/tests/**/*.cjs"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "commonjs",
            globals: {
                require: "readonly",
                module: "readonly",
                __dirname: "readonly",
                __filename: "readonly",
                process: "readonly",
                console: "readonly",
                setTimeout: "readonly",
                setInterval: "readonly",
                clearTimeout: "readonly",
                clearInterval: "readonly",
            },
        },
    },
    {
        ignores: ["client/js/lib/**", "client/js/mapworker.js"],
    },
];
