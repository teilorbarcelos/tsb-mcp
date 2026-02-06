import { MCPServer, object } from 'mcp-use/server';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export function registerBashTools(server: MCPServer) {
    server.tool(
        {
            name: 'bash',
            description: 'Execute a bash command',
            schema: z.object({
                command: z.string().describe('The bash command to execute'),
            }),
        },
        async ({ command }) => {
            try {
                const { stdout, stderr } = await execAsync(command);
                return object({
                    stdout,
                    stderr,
                });
            } catch (error) {
                // If the command fails (non-zero exit code), execAsync throws an error
                // The error object typically contains stdout and stderr from the failed process
                const err = error as any;
                return object({
                    error: err.message,
                    stdout: err.stdout || '',
                    stderr: err.stderr || '',
                    code: err.code
                });
            }
        }
    );
}
