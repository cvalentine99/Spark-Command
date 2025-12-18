# DGX Spark Support RAG Knowledge Base

This knowledge base provides comprehensive documentation, troubleshooting guides, and FAQ content for NVIDIA DGX Spark systems. It is designed to power the AI Support Assistant in the DGX Spark Command Center.

## Structure

```
knowledge-base/
├── hardware/                    # Hardware specifications and requirements
│   └── dgx-spark-specifications.md
├── software/                    # Software stack documentation
│   └── software-stack.md
├── networking/                  # Network configuration guides
│   └── cluster-networking.md
├── troubleshooting/             # Problem diagnosis and resolution
│   ├── gpu-issues.md
│   ├── spark-rapids-issues.md
│   └── networking-issues.md
├── faq/                         # Frequently asked questions
│   └── general-faq.md
├── best-practices/              # Operational best practices
│   └── operations-guide.md
├── knowledge-index.json         # RAG retrieval index
└── README.md                    # This file
```

## Knowledge Index

The `knowledge-index.json` file contains:

- **Categories**: Organized groupings of documentation
- **Documents**: Metadata for each knowledge document
- **Quick Answers**: Pre-computed answers for common questions
- **Error Codes**: GPU and system error code reference
- **Commands**: Common diagnostic and management commands

## Document Format

All knowledge documents are written in Markdown with the following conventions:

1. **Headers**: Use `##` for main sections, `###` for subsections
2. **Code Blocks**: Use fenced code blocks with language identifiers
3. **Tables**: Use Markdown tables for structured data
4. **Commands**: Wrap commands in backticks or code blocks

## Integration

### RAG Retrieval

The Support Assistant uses the knowledge index to:

1. Match user queries to relevant documents
2. Extract quick answers for common questions
3. Provide error code lookups
4. Suggest relevant commands

### Updating Content

To update the knowledge base:

1. Edit the relevant Markdown file in the appropriate directory
2. Update `knowledge-index.json` if adding new documents
3. Add new quick answers or error codes as needed
4. Test the Support Assistant with sample queries

## Content Coverage

### Hardware (hw-001)
- GB10 Superchip specifications
- CPU/GPU architecture details
- Memory and storage specs
- Power and thermal requirements
- Cluster configuration

### Software (sw-001)
- DGX OS and kernel
- CUDA platform
- AI frameworks (PyTorch, TensorFlow, JAX)
- RAPIDS ecosystem
- Inference serving (vLLM, Triton)
- Container ecosystem

### Networking (net-001)
- USB4/Thunderbolt interconnect
- 10GbE configuration
- Firewall rules
- SSH setup
- NFS shared storage

### Troubleshooting
- **GPU Issues (ts-001)**: Detection, OOM, temperature, XID errors
- **Spark/RAPIDS (ts-002)**: Job failures, plugin issues, performance
- **Networking (ts-003)**: Connectivity, DNS, NFS, SSH

### FAQ (faq-001)
- General questions
- Hardware questions
- Software questions
- Performance questions
- Cluster questions
- Maintenance questions

### Best Practices (bp-001)
- System setup
- Memory management
- Performance optimization
- Cluster operation
- Security
- Monitoring
- Maintenance

## Error Code Reference

| Code | Severity | Category |
|------|----------|----------|
| XID 13 | High | GPU |
| XID 31 | High | GPU |
| XID 43 | Critical | GPU |
| XID 48 | Critical | GPU |
| XID 79 | Critical | GPU |
| CUDA OOM | Medium | Memory |
| NCCL Error | Medium | Multi-GPU |

## Command Reference

### Monitoring
- `nvidia-smi` - GPU status
- `nvidia-smi -q` - Detailed info
- `nvidia-smi dmon` - Real-time monitoring
- `dcgmi health` - Health check
- `dcgmi diag` - Diagnostics

### Recovery
- `sudo nvidia-smi -r` - Reset GPU
- `sudo modprobe nvidia` - Reload driver

### Networking
- `boltctl list` - Thunderbolt devices
- `iperf3` - Bandwidth test

## Contributing

When adding new content:

1. Follow the existing document structure
2. Include practical examples and commands
3. Add entries to `knowledge-index.json`
4. Test with the Support Assistant

## License

This knowledge base is part of the DGX Spark Command Center project.
