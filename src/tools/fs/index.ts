import { MCPServer, object } from 'mcp-use/server';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';

export function registerFsTools(server: MCPServer) {
    // List Directory
    server.tool(
        {
            name: 'fs-ls',
            description: 'List the contents of a directory',
            schema: z.object({
                path: z.string().describe('Absolute path to list'),
            }),
        },
        async ({ path: dirPath }) => {
            try {
                const items = await fs.readdir(dirPath, { withFileTypes: true });
                const result = items.map((item) => ({
                    name: item.name,
                    isDirectory: item.isDirectory(),
                    isFile: item.isFile(),
                }));
                return object({ items: result });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                return object({ error: errorMessage });
            }
        }
    );

    // Read File
    server.tool(
        {
            name: 'fs-read',
            description: 'Read the contents of a file',
            schema: z.object({
                path: z.string().describe('Absolute path to file'),
                encoding: z.enum(['utf8', 'base64']).optional().default('utf8').describe('Encoding (utf8 or base64)'),
            }),
        },
        async ({ path: filePath, encoding }) => {
            try {
                const content = await fs.readFile(filePath, { encoding });
                return object({ content });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                return object({ error: errorMessage });
            }
        }
    );

    // Write File
    server.tool(
        {
            name: 'fs-write',
            description: 'Write content to a file',
            schema: z.object({
                path: z.string().describe('Absolute path to file'),
                content: z.string().describe('Content to write'),
                encoding: z.enum(['utf8', 'base64']).optional().default('utf8').describe('Encoding (utf8 or base64)'),
            }),
        },
        async ({ path: filePath, content, encoding }) => {
            try {
                // Ensure directory exists
                await fs.mkdir(path.dirname(filePath), { recursive: true });
                await fs.writeFile(filePath, content, { encoding });
                return object({ message: `File written to ${filePath}` });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                return object({ error: errorMessage });
            }
        }
    );

    // Make Directory
    server.tool(
        {
            name: 'fs-mkdir',
            description: 'Create a directory (recursive)',
            schema: z.object({
                path: z.string().describe('Absolute path to directory'),
            }),
        },
        async ({ path: dirPath }) => {
            try {
                await fs.mkdir(dirPath, { recursive: true });
                return object({ message: `Directory created at ${dirPath}` });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                return object({ error: errorMessage });
            }
        }
    );

    // Delete File/Directory
    server.tool(
        {
            name: 'fs-delete',
            description: 'Delete a file or directory',
            schema: z.object({
                path: z.string().describe('Absolute path to delete'),
                recursive: z.boolean().optional().default(false).describe('Delete recursively (for directories)'),
            }),
        },
        async ({ path: targetPath, recursive }) => {
            try {
                const stats = await fs.stat(targetPath);
                if (stats.isDirectory()) {
                    await fs.rm(targetPath, { recursive, force: true });
                } else {
                    await fs.unlink(targetPath);
                }
                return object({ message: `Deleted ${targetPath}` });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                return object({ error: errorMessage });
            }
        }
    );

    // Move/Rename File/Directory
    server.tool(
        {
            name: 'fs-move',
            description: 'Move or rename a file or directory',
            schema: z.object({
                source: z.string().describe('Source absolute path'),
                destination: z.string().describe('Destination absolute path'),
            }),
        },
        async ({ source, destination }) => {
            try {
                await fs.mkdir(path.dirname(destination), { recursive: true });
                await fs.rename(source, destination);
                return object({ message: `Moved ${source} to ${destination}` });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                return object({ error: errorMessage });
            }
        }
    );

    // Search Files
    server.tool(
        {
            name: 'fs-search',
            description: 'Search for files or directories recursively',
            schema: z.object({
                path: z.string().optional().default('/').describe('Absolute path to start search (defaults to /)'),
                query: z.string().describe('Search query (substring match, case-insensitive)'),
                type: z.enum(['file', 'directory', 'all']).optional().default('all').describe('Type of item to search for'),
            }),
        },
        async ({ path: rootDir, query, type }) => {
            try {
                const results: { path: string; type: 'file' | 'directory' }[] = [];
                const lowerQuery = query.toLowerCase();
                const maxResults = 100;
                const excludeDirs = new Set(['node_modules', '.git', 'dist', 'build', '.mcp-use', '.gemini']);

                async function traverse(currentDir: string) {
                    if (results.length >= maxResults) return;

                    try {
                        const items = await fs.readdir(currentDir, { withFileTypes: true });

                        for (const item of items) {
                            if (results.length >= maxResults) return;

                            const fullPath = path.join(currentDir, item.name);
                            const nameLower = item.name.toLowerCase();

                            // Skip excluded directories
                            if (item.isDirectory() && excludeDirs.has(item.name)) {
                                continue;
                            }

                            if (nameLower.includes(lowerQuery)) {
                                const isDir = item.isDirectory();
                                const matchType = isDir ? 'directory' : 'file';

                                if (type === 'all' || type === matchType) {
                                    results.push({
                                        path: fullPath,
                                        type: matchType,
                                    });
                                }
                            }

                            if (item.isDirectory()) {
                                await traverse(fullPath);
                            }
                        }
                    } catch (error) {
                        // Ignore access errors, etc during traversal
                    }
                }

                await traverse(rootDir);
                return object({ results });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                return object({ error: errorMessage });
            }
        }
    );

}
