/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log error
  console.error('Error:', err.message);
  if (err.stack) {
    console.error(err.stack);
  }

  // Determine status code
  let statusCode = err.statusCode || 500;

  // Handle axios errors from llama.cpp proxy
  if (err.isAxiosError) {
    statusCode = err.response?.status || 500;

    // If llama.cpp server is unreachable
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: {
          message: 'llama.cpp server is not available',
          type: 'service_unavailable',
          code: 'llama_server_down',
        },
      });
    }

    // Forward llama.cpp error response
    if (err.response?.data) {
      return res.status(statusCode).json({
        error: {
          message: err.response.data.error?.message || err.message,
          type: err.response.data.error?.type || 'llama_error',
          code: err.response.data.error?.code || 'unknown',
        },
      });
    }
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
  }

  // Send error response
  res.status(statusCode).json({
    error: {
      message: err.message || 'Internal server error',
      type: err.type || 'api_error',
      code: err.code || 'internal_error',
    },
  });
};

module.exports = errorHandler;
