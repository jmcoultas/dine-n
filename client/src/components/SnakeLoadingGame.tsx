import { useEffect, useState, useRef, useCallback } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";

interface SnakeLoadingGameProps {
  messages?: string[];
  baseMessage?: string;
  onComplete?: () => void;
}

// Game constants
const GRID_SIZE = 20;
const GAME_SPEED_MS = 150;
const AUTO_PLAY_DELAY_MS = 5000; // Start auto-play after 5 seconds of inactivity

// Food emojis to use as collectibles
const FOOD_EMOJIS = ["🍕", "🍔", "🍣", "🍜", "🥗", "🌮", "🍩", "🍦", "🍎", "🥑", "🥩", "🍗"];

// Snake body part emojis (different food ingredients)
const SNAKE_BODY_EMOJIS = ["🥦", "🥕", "🍅", "🧅", "🥔", "🍆"];

// Direction constants
enum Direction {
  UP = "UP",
  DOWN = "DOWN",
  LEFT = "LEFT",
  RIGHT = "RIGHT",
}

// Interface for position
interface Position {
  x: number;
  y: number;
}

export function SnakeLoadingGame({ 
  messages = [], 
  baseMessage = "Cooking up your meal plan...",
  onComplete
}: SnakeLoadingGameProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [autoPlaying, setAutoPlaying] = useState(false);
  
  // Game state
  const [snake, setSnake] = useState<Position[]>([
    { x: 10, y: 10 }, // Head
    { x: 9, y: 10 }, 
    { x: 8, y: 10 }  // Tail
  ]);
  const [food, setFood] = useState<Position>({ x: 15, y: 10 });
  const [direction, setDirection] = useState<Direction>(Direction.RIGHT);
  const [nextDirection, setNextDirection] = useState<Direction>(Direction.RIGHT);
  const [currentFoodEmoji, setCurrentFoodEmoji] = useState<string>(
    FOOD_EMOJIS[Math.floor(Math.random() * FOOD_EMOJIS.length)]
  );
  
  // Refs for game loop and canvas
  const gameLoopRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastInteractionTimeRef = useRef<number>(Date.now());
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Generate a random position for food
  const generateFood = useCallback((): Position => {
    const newFood: Position = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE)
    };

    // Make sure the food doesn't spawn on the snake
    if (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
      return generateFood();
    }

    // Change the food emoji
    setCurrentFoodEmoji(FOOD_EMOJIS[Math.floor(Math.random() * FOOD_EMOJIS.length)]);
    
    return newFood;
  }, [snake]);

  // Handle keyboard events for controlling the snake
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    lastInteractionTimeRef.current = Date.now();
    setAutoPlaying(false);
    
    // Prevent arrow keys from scrolling the page
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
      e.preventDefault();
    }

    switch (e.key) {
      case "ArrowUp":
        if (direction !== Direction.DOWN) {
          setNextDirection(Direction.UP);
        }
        break;
      case "ArrowDown":
        if (direction !== Direction.UP) {
          setNextDirection(Direction.DOWN);
        }
        break;
      case "ArrowLeft":
        if (direction !== Direction.RIGHT) {
          setNextDirection(Direction.LEFT);
        }
        break;
      case "ArrowRight":
        if (direction !== Direction.LEFT) {
          setNextDirection(Direction.RIGHT);
        }
        break;
      case " ": // Spacebar
        setPaused(prev => !prev);
        break;
    }
  }, [direction]);

  // Touch start and end positions for swipe controls
  const [touchStart, setTouchStart] = useState<Position | null>(null);

  // Handle touch events for mobile swipe controls
  const handleTouchStart = (e: React.TouchEvent) => {
    lastInteractionTimeRef.current = Date.now();
    setAutoPlaying(false);
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    
    // Determine if it's a horizontal or vertical swipe
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (deltaX > 50 && direction !== Direction.LEFT) {
        setNextDirection(Direction.RIGHT);
      } else if (deltaX < -50 && direction !== Direction.RIGHT) {
        setNextDirection(Direction.LEFT);
      }
    } else {
      // Vertical swipe
      if (deltaY > 50 && direction !== Direction.UP) {
        setNextDirection(Direction.DOWN);
      } else if (deltaY < -50 && direction !== Direction.DOWN) {
        setNextDirection(Direction.UP);
      }
    }
    
    setTouchStart(null);
  };

  // Auto-play logic
  const autoPlayStep = useCallback(() => {
    const head = snake[0];
    const foodDirection = { x: food.x - head.x, y: food.y - head.y };
    
    // Simple AI to move toward food
    if (Math.abs(foodDirection.x) > Math.abs(foodDirection.y)) {
      // Move horizontally first
      if (foodDirection.x > 0 && direction !== Direction.LEFT) {
        setNextDirection(Direction.RIGHT);
      } else if (foodDirection.x < 0 && direction !== Direction.RIGHT) {
        setNextDirection(Direction.LEFT);
      } else if (foodDirection.y > 0 && direction !== Direction.UP) {
        setNextDirection(Direction.DOWN);
      } else if (foodDirection.y < 0 && direction !== Direction.DOWN) {
        setNextDirection(Direction.UP);
      }
    } else {
      // Move vertically first
      if (foodDirection.y > 0 && direction !== Direction.UP) {
        setNextDirection(Direction.DOWN);
      } else if (foodDirection.y < 0 && direction !== Direction.DOWN) {
        setNextDirection(Direction.UP);
      } else if (foodDirection.x > 0 && direction !== Direction.LEFT) {
        setNextDirection(Direction.RIGHT);
      } else if (foodDirection.x < 0 && direction !== Direction.RIGHT) {
        setNextDirection(Direction.LEFT);
      }
    }
  }, [snake, food, direction]);

  // Game update function - called on each frame
  const updateGame = useCallback(() => {
    if (paused || gameOver) return;
    
    // Check if we should start auto-play
    const now = Date.now();
    if (!autoPlaying && now - lastInteractionTimeRef.current > AUTO_PLAY_DELAY_MS) {
      setAutoPlaying(true);
    }
    
    // Run auto-play logic if active
    if (autoPlaying) {
      autoPlayStep();
    }
    
    setDirection(nextDirection);
    
    // Move the snake
    const newSnake = [...snake];
    const head = { ...newSnake[0] };
    
    // Update head position based on direction
    switch (nextDirection) {
      case Direction.UP:
        head.y -= 1;
        break;
      case Direction.DOWN:
        head.y += 1;
        break;
      case Direction.LEFT:
        head.x -= 1;
        break;
      case Direction.RIGHT:
        head.x += 1;
        break;
    }
    
    // Wrap around the edges
    if (head.x < 0) head.x = GRID_SIZE - 1;
    if (head.x >= GRID_SIZE) head.x = 0;
    if (head.y < 0) head.y = GRID_SIZE - 1;
    if (head.y >= GRID_SIZE) head.y = 0;
    
    // Check for collision with self
    if (newSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
      setGameOver(true);
      return;
    }
    
    // Add new head
    newSnake.unshift(head);
    
    // Check if food was eaten
    if (head.x === food.x && head.y === food.y) {
      // Don't remove the tail (snake grows)
      setScore(prev => prev + 10);
      setFood(generateFood());
    } else {
      // Remove the tail if no food was eaten
      newSnake.pop();
    }
    
    setSnake(newSnake);
  }, [snake, food, direction, nextDirection, paused, gameOver, autoPlaying, generateFood, autoPlayStep]);

  // Setup game loop
  useEffect(() => {
    gameLoopRef.current = window.setInterval(updateGame, GAME_SPEED_MS);
    
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [updateGame]);

  // Add keyboard event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Cycling through loading messages
  useEffect(() => {
    if (messages.length === 0) return;

    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
        setIsTransitioning(false);
      }, 300); // Wait for fade out before changing message
    }, 3000); // Rotate every 3 seconds

    return () => clearInterval(interval);
  }, [messages.length]);

  // Reset game
  const resetGame = () => {
    setSnake([
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ]);
    setFood(generateFood());
    setDirection(Direction.RIGHT);
    setNextDirection(Direction.RIGHT);
    setScore(0);
    setGameOver(false);
    setPaused(false);
    lastInteractionTimeRef.current = Date.now();
    setAutoPlaying(false);
  };

  // Draw the game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background (kitchen counter)
    ctx.fillStyle = '#f0e6d2';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines (cutting board pattern)
    ctx.strokeStyle = '#d6c8a9';
    ctx.lineWidth = 1;
    
    const cellSize = canvas.width / GRID_SIZE;
    
    // Vertical lines
    for (let i = 1; i < GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvas.height);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let i = 1; i < GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvas.width, i * cellSize);
      ctx.stroke();
    }
    
    // Set font for emojis
    ctx.font = `${cellSize * 0.8}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw food
    ctx.fillText(
      currentFoodEmoji,
      food.x * cellSize + cellSize / 2,
      food.y * cellSize + cellSize / 2
    );
    
    // Draw snake
    snake.forEach((segment, index) => {
      // Use different emojis for head, body, and tail
      let emoji;
      if (index === 0) {
        // Head (always the first vegetable emoji)
        emoji = SNAKE_BODY_EMOJIS[0];
      } else {
        // Body (cycle through vegetable emojis)
        emoji = SNAKE_BODY_EMOJIS[index % SNAKE_BODY_EMOJIS.length];
      }
      
      ctx.fillText(
        emoji,
        segment.x * cellSize + cellSize / 2,
        segment.y * cellSize + cellSize / 2
      );
    });
    
    // Draw score
    ctx.fillStyle = '#5d4037';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 10, 30);
    
    // Draw game over message
    if (gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = 'white';
      ctx.font = '30px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 30);
      ctx.font = '20px Arial';
      ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
      ctx.fillText('Press Space to restart', canvas.width / 2, canvas.height / 2 + 50);
    }
    
    // Draw paused message
    if (paused && !gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = 'white';
      ctx.font = '30px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Paused', canvas.width / 2, canvas.height / 2);
      ctx.font = '20px Arial';
      ctx.fillText('Press Space to continue', canvas.width / 2, canvas.height / 2 + 50);
    }
    
    // Display auto-play message if active
    if (autoPlaying && !gameOver && !paused) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Auto-playing (press an arrow key to take control)', canvas.width / 2, canvas.height - 30);
    }
    
  }, [snake, food, score, gameOver, paused, autoPlaying, currentFoodEmoji]);

  const currentMessage = messages.length > 0 
    ? messages[currentMessageIndex]
    : baseMessage;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
      <div className="flex flex-col bg-card rounded-lg shadow-lg w-full max-w-2xl mx-auto overflow-hidden relative">
        {/* Loading message at the top */}
        <div className="p-4 border-b border-border bg-muted/30">
          <p 
            key={currentMessageIndex} 
            className={`text-xl font-medium text-foreground text-center transition-all duration-300 ${
              isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
            }`}
          >
            {currentMessage}
          </p>
        </div>
        
        {/* Game canvas */}
        <div className="w-full p-4 flex justify-center bg-background">
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            className="border border-border rounded-md shadow-md"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          />
        </div>
        
        {/* Game controls for mobile */}
        {isMobile && (
          <div className="p-4 border-t border-border bg-muted/30 flex flex-col items-center">
            <p className="text-sm text-muted-foreground mb-2">
              Swipe to control the snake
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div />
              <button 
                className="p-2 bg-primary/10 rounded-md"
                onTouchStart={() => {
                  if (direction !== Direction.DOWN) {
                    setNextDirection(Direction.UP);
                  }
                  lastInteractionTimeRef.current = Date.now();
                  setAutoPlaying(false);
                }}
              >
                ⬆️
              </button>
              <div />
              <button 
                className="p-2 bg-primary/10 rounded-md"
                onTouchStart={() => {
                  if (direction !== Direction.RIGHT) {
                    setNextDirection(Direction.LEFT);
                  }
                  lastInteractionTimeRef.current = Date.now();
                  setAutoPlaying(false);
                }}
              >
                ⬅️
              </button>
              <button 
                className="p-2 bg-primary/10 rounded-md"
                onTouchStart={() => {
                  setPaused(prev => !prev);
                  if (gameOver) resetGame();
                }}
              >
                {paused ? '▶️' : '⏸️'}
              </button>
              <button 
                className="p-2 bg-primary/10 rounded-md"
                onTouchStart={() => {
                  if (direction !== Direction.LEFT) {
                    setNextDirection(Direction.RIGHT);
                  }
                  lastInteractionTimeRef.current = Date.now();
                  setAutoPlaying(false);
                }}
              >
                ➡️
              </button>
              <div />
              <button 
                className="p-2 bg-primary/10 rounded-md"
                onTouchStart={() => {
                  if (direction !== Direction.UP) {
                    setNextDirection(Direction.DOWN);
                  }
                  lastInteractionTimeRef.current = Date.now();
                  setAutoPlaying(false);
                }}
              >
                ⬇️
              </button>
              <div />
            </div>
          </div>
        )}
        
        {/* Game instructions and controls for desktop */}
        {!isMobile && (
          <div className="p-4 border-t border-border bg-muted/30">
            <p className="text-sm text-muted-foreground text-center mb-2">
              Use arrow keys to control the snake. Press space to pause/resume.
            </p>
            <p className="text-xs text-muted-foreground text-center">
              The game will play itself after 5 seconds of inactivity.
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 