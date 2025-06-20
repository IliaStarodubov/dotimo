import { useState, useRef, useEffect } from "react";
import "./App.css";

function App() {
  const PLAYGROUND_SIZE = 800;
  const SNAP_DISTANCE = 30;
  const COLOR_OPTIONS = ["rgb(9 236 146)", "rgb(115 0 255)", "rgb(255 209 0)"];

  const [cubes, setCubes] = useState([
    {
      id: 1,
      x: 100,
      y: 100,
      width: 100,
      height: 100,
      color: "rgb(9 236 146)",
      isSelected: true,
    },
    {
      id: 2,
      x: 300,
      y: 300,
      width: 80,
      height: 80,
      color: "rgb(115 0 255)",
      isSelected: false,
    },
  ]);
  const [stuckCubes, setStuckCubes] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const playgroundRef = useRef(null);

  const selectedCube = cubes.find((cube) => cube.isSelected);

  const selectCube = (id) => {
    setCubes(
      cubes.map((cube) => ({
        ...cube,
        isSelected: cube.id === id,
      }))
    );
  };

  const changeCubeColor = (color) => {
    if (!selectedCube) return;
    setCubes(
      cubes.map((cube) =>
        cube.id === selectedCube.id ? { ...cube, color } : cube
      )
    );
  };

  const startDrag = (e, id) => {
    const cube = cubes.find((c) => c.id === id);
    if (!cube) return;

    selectCube(id);
    setIsDragging(true);

    const playgroundRect = playgroundRef.current.getBoundingClientRect();
    const offsetX = e.clientX - playgroundRect.left - cube.x;
    const offsetY = e.clientY - playgroundRect.top - cube.y;
    setDragOffset({ x: offsetX, y: offsetY });

    e.preventDefault();
  };

  const handleDrag = (e) => {
    if (!isDragging || !selectedCube) return;

    const playgroundRect = playgroundRef.current.getBoundingClientRect();
    let newX = e.clientX - playgroundRect.left - dragOffset.x;
    let newY = e.clientY - playgroundRect.top - dragOffset.y;

    newX = Math.max(0, Math.min(PLAYGROUND_SIZE - selectedCube.width, newX));
    newY = Math.max(0, Math.min(PLAYGROUND_SIZE - selectedCube.height, newY));

    const updatedCubes = cubes.map((cube) => {
      if (cube.id === selectedCube.id) {
        return { ...cube, x: newX, y: newY };
      }
      return cube;
    });

    if (stuckCubes.length > 0) {
      const dx = newX - selectedCube.x;
      const dy = newY - selectedCube.y;

      stuckCubes.forEach((stuckId) => {
        if (stuckId !== selectedCube.id) {
          const stuckCube = updatedCubes.find((c) => c.id === stuckId);
          if (stuckCube) {
            const newStuckX = stuckCube.x + dx;
            const newStuckY = stuckCube.y + dy;

            if (
              newStuckX >= 0 &&
              newStuckX <= PLAYGROUND_SIZE - stuckCube.width &&
              newStuckY >= 0 &&
              newStuckY <= PLAYGROUND_SIZE - stuckCube.height
            ) {
              const index = updatedCubes.findIndex((c) => c.id === stuckId);
              updatedCubes[index] = {
                ...stuckCube,
                x: newStuckX,
                y: newStuckY,
              };
            }
          }
        }
      });
    }

    setCubes(updatedCubes);
    checkSnapping(updatedCubes);
  };

  const endDrag = () => {
    setIsDragging(false);
  };

  const checkSnapping = (currentCubes) => {
    if (!selectedCube || stuckCubes.length > 0) return;

    const otherCubes = currentCubes.filter(
      (cube) => cube.id !== selectedCube.id
    );
    const newStuckCubes = [];

    otherCubes.forEach((cube) => {
      const distance = Math.sqrt(
        Math.pow(
          selectedCube.x + selectedCube.width / 2 - (cube.x + cube.width / 2),
          2
        ) +
          Math.pow(
            selectedCube.y +
              selectedCube.height / 2 -
              (cube.y + cube.height / 2),
            2
          )
      );

      if (distance < SNAP_DISTANCE) {
        newStuckCubes.push(selectedCube.id, cube.id);
      }
    });

    if (newStuckCubes.length > 0) {
      setStuckCubes([...new Set(newStuckCubes)]);
    }
  };

  const separateCubes = () => {
    if (stuckCubes.length === 0) return;

    const updatedCubes = [...cubes];

    stuckCubes.forEach((cubeId) => {
      const cubeIndex = updatedCubes.findIndex((c) => c.id === cubeId);
      if (cubeIndex >= 0) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 50 + Math.random() * 50;

        let newX = updatedCubes[cubeIndex].x + Math.cos(angle) * distance;
        let newY = updatedCubes[cubeIndex].y + Math.sin(angle) * distance;

        newX = Math.max(
          0,
          Math.min(PLAYGROUND_SIZE - updatedCubes[cubeIndex].width, newX)
        );
        newY = Math.max(
          0,
          Math.min(PLAYGROUND_SIZE - updatedCubes[cubeIndex].height, newY)
        );

        updatedCubes[cubeIndex] = {
          ...updatedCubes[cubeIndex],
          x: newX,
          y: newY,
        };
      }
    });

    setCubes(updatedCubes);
    setStuckCubes([]);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleDrag);
      window.addEventListener("mouseup", endDrag);
      return () => {
        window.removeEventListener("mousemove", handleDrag);
        window.removeEventListener("mouseup", endDrag);
      };
    }
  }, [isDragging, cubes, selectedCube, dragOffset, stuckCubes]);

  return (
    <div className="app">
      <div className="controls">
        <div className="color-picker">
          <span>Цвет кубика: </span>
          {COLOR_OPTIONS.map((color) => (
            <div
              key={color}
              className="color-option"
              style={{ backgroundColor: color }}
              onClick={() => changeCubeColor(color)}
            />
          ))}
        </div>
        <button
          className="separate-btn"
          onClick={separateCubes}
          disabled={stuckCubes.length === 0}
        >
          Разъединить
        </button>
      </div>

      <div
        className="playground"
        ref={playgroundRef}
        style={{ width: PLAYGROUND_SIZE, height: PLAYGROUND_SIZE }}
      >
        {cubes.map((cube) => (
          <div
            key={cube.id}
            className={`cube ${cube.isSelected ? "selected" : ""} ${stuckCubes.includes(cube.id) ? "stuck" : ""}`}
            style={{
              left: cube.x,
              top: cube.y,
              width: cube.width,
              height: cube.height,
              backgroundColor: cube.color,
            }}
            onMouseDown={(e) => startDrag(e, cube.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default App;
