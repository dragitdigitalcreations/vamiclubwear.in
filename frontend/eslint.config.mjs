// ESLint flat config (ESLint 9). FlatCompat bridges the legacy
// `eslint-config-next` shareable config (which is still RC-based) into the
// flat format until Next ships a native flat export.
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({ baseDirectory: __dirname })

export default [
  ...compat.extends('next/core-web-vitals'),
  {
    ignores: ['.next/**', 'node_modules/**', 'out/**', 'build/**', 'public/**'],
  },
]
