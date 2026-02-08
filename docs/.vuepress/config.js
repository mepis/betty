import { defaultTheme } from '@vuepress/theme-default'
import { defineUserConfig } from 'vuepress/cli'
import { viteBundler } from '@vuepress/bundler-vite'

export default defineUserConfig({
  lang: 'en-US',
  title: 'Betty',
  description: 'llama.cpp REST API with OpenAI-compatible endpoints',

  base: '/docs/',

  theme: defaultTheme({
    logo: '/logo.svg',

    navbar: [
      {
        text: 'Guide',
        link: '/guide/',
      },
      {
        text: 'API Reference',
        link: '/api/',
      },
      {
        text: 'Advanced',
        link: '/advanced/',
      },
      {
        text: 'GitHub',
        link: 'https://github.com/yourusername/betty',
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          children: [
            '/guide/README.md',
            '/guide/installation.md',
            '/guide/configuration.md',
            '/guide/quickstart.md',
            '/guide/frontend.md',
            '/guide/troubleshooting.md',
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          children: [
            '/api/README.md',
            '/api/completions.md',
            '/api/chat.md',
            '/api/embeddings.md',
            '/api/models.md',
            '/api/documents.md',
            '/api/rag.md',
            '/api/auth.md',
          ],
        },
      ],
      '/advanced/': [
        {
          text: 'Advanced Topics',
          children: [
            '/advanced/README.md',
            '/advanced/gpu-configuration.md',
            '/advanced/rag-system.md',
            '/advanced/model-management.md',
            '/advanced/authentication.md',
            '/advanced/deployment.md',
          ],
        },
      ],
    },

    // Repository
    repo: 'yourusername/betty',
    docsDir: 'docs',

    // Edit links
    editLink: true,
    editLinkText: 'Edit this page on GitHub',
    lastUpdated: true,
    lastUpdatedText: 'Last Updated',

    contributors: true,
    contributorsText: 'Contributors',
  }),

  bundler: viteBundler(),
})
