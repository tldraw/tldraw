## Run Agent

  1. Make sure you have your API key in /templates/agent/.dev.vars:
  ANTHROPIC_API_KEY=your_actual_api_key_here

  Startup Steps

  Step 1: Navigate to the template directory
  cd templates/agent

  Step 2: Install dependencies (if needed)
  yarn install

  Step 3: Build the frontend
  yarn build

  Step 4: Start the worker (in one terminal)
  yarn wrangler dev --local --port 8787
  Keep this terminal open - you should see "Ready on http://localhost:8787"

  Step 5: Start the frontend (in another terminal)
  yarn dev
  Keep this terminal open - you should see "ready in XXX ms" and "Local: http://localhost:5173/"

  Step 6: Open in browser
  Go to: http://localhost:5173/



  # Agent set up

  - 0,0 is the top left corner. The x-axis increases as you scroll to the right. The y-axis increases as you scroll down the canvas.
  - The x and y define the top left corner of the shape. The shape's origin is in its top left corner.
  - Note shapes are 50x50. They're sticky notes and are only suitable for tiny sentences. Use a geometric shape or text shape if you need to write more.

  ### Offset-Based Positioning (templates/agent/shared/AgentHelpers.ts:37-42)
  - When a chat session starts, the agent records a $chatOrigin based on the current viewport position
  - All coordinates sent to the AI model are offset relative to this chat origin to keep numbers small and manageable
  - This means positions like (0, 0) in the AI's understanding correspond to wherever the chat started on the canvas


  Viewport-Aware Placement (templates/agent/shared/types/AgentRequest.ts:32-34)
  - Every agent request includes bounds: BoxModel that defines the current focus area
  - By default, this is set to editor.getViewportPageBounds() - what the user currently sees
  - The agent understands it should place new content within or near these bounds



  ## Run automatic
  ```
  python automated_sketch.py test.JPG "draw a circle around each person's head" test_output.JPG --endpoint http://localhost:8789/stream --timeout 60
  ```