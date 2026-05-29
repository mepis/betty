# Llamafile

A llamafile is a self-contained executable bundle that packages a llama.cpp build together with a GGUF model file. It can be executed directly without installing llama.cpp or any dependencies.

**Tags**: `llamafile`, `portable`, `executable`

---

## What is a Llamafile?

A llamafile is a single executable file that:

1. Contains a compiled llama.cpp binary
2. Embeds a GGUF model (e.g., Llama 3, Mistral, etc.)
3. Can run on macOS, Linux, and Windows (with WSL)
4. Requires no additional dependencies to install

## Creating a Llamafile

To create a llamafile, combine a llama.cpp binary with a GGUF model:

```bash
# Build llama.cpp with the llamafile example
make llamafile

# Combine with a model
cat llamafile models/your-model.gguf > my-model.llamafile

# Make it executable
chmod +x my-model.llamafile
```

## Running a Llamafile

```bash
# Run the model directly
./my-model.llamafile

# Run in server mode
./my-model.llamafile -m models/gpt-2.gguf --server

# Run with specific parameters
./my-model.llamafile -p "Hello, how are you?" -n 128
```

## Advantages

- **Portable**: Single file, no installation needed
- **Cross-platform**: Works on macOS, Linux, and Windows
- **Self-contained**: No need to manage model files separately
- **Fast**: Optimized builds included

## Limitations

- Larger file size (model + binary)
- Less flexible than building from source
- Updates require rebuilding

---

## See Also

- [[llama-cpp/server/server-overview\|Server Overview]] — Server deployment options
- [[llama-cpp/architecture\|Architecture]] — llama.cpp architecture overview
