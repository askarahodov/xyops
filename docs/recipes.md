# Overview

This document provides a set of useful recipes you can use in Ops Rocket.

## Continuous Jobs

A continuous job is defined as a job that automatically relaunches itself upon completion. This functionality can enhance the efficiency and reliability of job execution in various systems.

### Implementing Continuous Jobs

To implement a continuous job, follow these steps:

1. **Wire Up Completion Actions**: 
   - Set up actions that will trigger the same event upon job completion.

2. **Error Handling**:
   - If the job fails, implement a separate error handler. This handler can:
     - Notify the responsible parties about the failure.
     - Restart the job if necessary.

### Managing Job Failures

For jobs that experience repeated failures, it is essential to manage the process to prevent system disruption. Consider the following strategies:

- **Retry Limiter**: 
  - Establish a maximum limit for retries to avoid indefinite job execution.

- **Retry Delay**: 
  - Introduce a delay between retries to allow for recovery or resolution of the underlying issue.

### Summary

By following these guidelines, you can create a robust continuous job system that can efficiently manage execution, handle errors gracefully, and avoid negative impacts on system performance. 
