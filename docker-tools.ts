// @ts-ignore
import Docker from 'dockerode';
import { MCPServer, object } from 'mcp-use/server';
import { z } from 'zod';

const docker = new Docker();

export function registerDockerTools(server: MCPServer) {
    // List Containers
    server.tool(
        {
            name: 'docker-list-containers',
            description: 'List all Docker containers (running and stopped)',
            schema: z.object({
                all: z.boolean().optional().default(true).describe('Show all containers (default: true)'),
            }),
        },
        async ({ all }) => {
            try {
                const containers = await docker.listContainers({ all });
                return object({ containers });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                return object({ error: errorMessage });
            }
        }
    );

    // Start Container
    server.tool(
        {
            name: 'docker-start-container',
            description: 'Start a Docker container',
            schema: z.object({
                containerId: z.string().describe('Container ID or Name'),
            }),
        },
        async ({ containerId }) => {
            try {
                const container = docker.getContainer(containerId);
                await container.start();
                return object({ message: `Container ${containerId} started successfully` });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                return object({ error: errorMessage });
            }
        }
    );

    // Stop Container
    server.tool(
        {
            name: 'docker-stop-container',
            description: 'Stop a Docker container',
            schema: z.object({
                containerId: z.string().describe('Container ID or Name'),
            }),
        },
        async ({ containerId }) => {
            try {
                const container = docker.getContainer(containerId);
                await container.stop();
                return object({ message: `Container ${containerId} stopped successfully` });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                return object({ error: errorMessage });
            }
        }
    );

    // Remove Container
    server.tool(
        {
            name: 'docker-remove-container',
            description: 'Remove a Docker container',
            schema: z.object({
                containerId: z.string().describe('Container ID or Name'),
                force: z.boolean().optional().default(false).describe('Force the removal of a running container (default: false)'),
            }),
        },
        async ({ containerId, force }) => {
            try {
                const container = docker.getContainer(containerId);
                await container.remove({ force });
                return object({ message: `Container ${containerId} removed successfully` });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                return object({ error: errorMessage });
            }
        }
    );

    // Get Container Logs
    server.tool(
        {
            name: 'docker-get-logs',
            description: 'Get logs from a Docker container',
            schema: z.object({
                containerId: z.string().describe('Container ID or Name'),
                tail: z.number().optional().default(100).describe('Number of lines to show from the end of the logs'),
            }),
        },
        async ({ containerId, tail }) => {
            try {
                const container = docker.getContainer(containerId);
                const logs = await container.logs({
                    follow: false,
                    stdout: true,
                    stderr: true,
                    tail: tail
                });
                // Logs are returned as a Buffer/string
                return object({ logs: logs.toString() });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                return object({ error: errorMessage });
            }
        }
    );

    // Inspect Container
    server.tool(
        {
            name: 'docker-inspect-container',
            description: 'Inspect a Docker container to get detailed information using its ID or Name',
            schema: z.object({
                containerId: z.string().describe('Container ID or Name'),
            }),
        },
        async ({ containerId }) => {
            try {
                const container = docker.getContainer(containerId);
                const data = await container.inspect();
                return object({ data });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                return object({ error: errorMessage });
            }
        }
    );
}
