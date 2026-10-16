# Troubleshooting

- **AI Fails**: Ensure `OPENAI_API_KEY` is set.
- **Dependencies loop**: Capabilities use a graph resolver. Ensure no circular requirements exist in the registry.