# Documentation

Betty uses VuePress for documentation.

## Viewing the Documentation

### Development Mode

Run the documentation site locally with hot reload:

```bash
npm run docs:dev
```

Then open [http://localhost:8080](http://localhost:8080) in your browser.

### Build Static Site

Build the documentation to static HTML:

```bash
npm run docs:build
```

The built files will be in `docs/.vuepress/dist/`.

## Documentation Structure

```
docs/
├── .vuepress/
│   └── config.js          # VuePress configuration
├── README.md               # Home page
├── guide/
│   ├── README.md          # Introduction
│   ├── installation.md    # Installation guide
│   ├── quickstart.md      # Quick start tutorial
│   ├── configuration.md   # Configuration reference
│   ├── frontend.md        # Frontend guide
│   └── troubleshooting.md # Troubleshooting guide
├── api/
│   ├── README.md          # API overview
│   ├── completions.md     # Completions API
│   ├── chat.md            # Chat API
│   ├── embeddings.md      # Embeddings API
│   ├── models.md          # Models API
│   ├── documents.md       # Documents API
│   └── auth.md            # Authentication API
└── advanced/
    ├── README.md          # Advanced topics overview
    ├── rag.md             # RAG system
    ├── model-management.md # Model management
    ├── authentication.md  # Authentication & security
    ├── gpu-config.md      # GPU configuration
    └── deployment.md      # Deployment guide
```

## Contributing to Documentation

1. Edit the relevant `.md` file in the `docs/` directory
2. Use Markdown with VuePress extensions
3. Test locally with `npm run docs:dev`
4. Submit a pull request

### Markdown Features

VuePress supports standard Markdown plus:

**Custom Containers:**
```markdown
::: tip
This is a tip
:::

::: warning
This is a warning
:::

::: danger
This is a dangerous warning
:::
```

**Code Blocks with Syntax Highlighting:**
```markdown
```javascript
const hello = 'world';
```
```

**Internal Links:**
```markdown
[Link to guide](/guide/installation.html)
```

## Deployment

### GitHub Pages

Build and deploy to GitHub Pages:

```bash
npm run docs:build
cd docs/.vuepress/dist
git init
git add -A
git commit -m 'deploy docs'
git push -f git@github.com:yourusername/betty.git master:gh-pages
```

### Static Hosting

The built documentation in `docs/.vuepress/dist/` can be hosted on:

- GitHub Pages
- Netlify
- Vercel
- AWS S3 + CloudFront
- Any static file server

## Updating Documentation

After making changes to Betty's code or features:

1. Update relevant documentation files
2. Test the docs locally
3. Build the docs
4. Deploy to hosting

## Questions?

- [VuePress Documentation](https://v2.vuepress.vuejs.org/)
- [Markdown Guide](https://www.markdownguide.org/)
