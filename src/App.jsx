import { useState, useRef, useEffect } from "react";
import "./App.css";

function App() {
  const PLAYGROUND_SIZE = 800;
  const SNAP_DISTANCE = 10;
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
  const [stuckGroup, setStuckGroup] = useState(null);
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

    if (stuckGroup) {
      // Перемещение группы кубиков
      const groupCubes = cubes.filter((c) => stuckGroup.cubeIds.includes(c.id));
      const mainCube =
        groupCubes.find((c) => c.id === stuckGroup.mainId) || groupCubes[0];

      const dx = newX - mainCube.x;
      const dy = newY - mainCube.y;

      // Проверяем границы для каждого кубика в группе
      let canMoveX = true;
      let canMoveY = true;

      groupCubes.forEach((cube) => {
        const newCubeX = cube.x + dx;
        const newCubeY = cube.y + dy;

        if (newCubeX < 0 || newCubeX > PLAYGROUND_SIZE - cube.width) {
          canMoveX = false;
        }
        if (newCubeY < 0 || newCubeY > PLAYGROUND_SIZE - cube.height) {
          canMoveY = false;
        }
      });

      const updatedCubes = cubes.map((cube) => {
        if (stuckGroup.cubeIds.includes(cube.id)) {
          return {
            ...cube,
            x: canMoveX ? cube.x + dx : cube.x,
            y: canMoveY ? cube.y + dy : cube.y,
          };
        }
        return cube;
      });

      setCubes(updatedCubes);
    } else {
      // Перемещение одиночного кубика с возможностью скольжения по границам
      newX = Math.max(0, Math.min(PLAYGROUND_SIZE - selectedCube.width, newX));
      newY = Math.max(0, Math.min(PLAYGROUND_SIZE - selectedCube.height, newY));

      // Если кубик у границы, разрешаем движение только вдоль границы
      const atLeftEdge = newX <= 0;
      const atRightEdge = newX >= PLAYGROUND_SIZE - selectedCube.width;
      const atTopEdge = newY <= 0;
      const atBottomEdge = newY >= PLAYGROUND_SIZE - selectedCube.height;

      const updatedCubes = cubes.map((cube) => {
        if (cube.id === selectedCube.id) {
          return {
            ...cube,
            x: atTopEdge || atBottomEdge ? cube.x : newX,
            y: atLeftEdge || atRightEdge ? cube.y : newY,
          };
        }
        return cube;
      });

      setCubes(updatedCubes);
      checkEdgeSnapping(updatedCubes);
    }
  };

  const endDrag = () => {
    setIsDragging(false);
  };

  const checkEdgeSnapping = (currentCubes) => {
    if (!selectedCube || stuckGroup) return;

    const otherCubes = currentCubes.filter(
      (cube) => cube.id !== selectedCube.id
    );
    let newGroup = null;

    otherCubes.forEach((cube) => {
      const sides = [
        {
          // Левая сторона к правой
          condition:
            Math.abs(selectedCube.x - (cube.x + cube.width)) <= SNAP_DISTANCE,
          adjust: () => ({ x: cube.x + cube.width, y: selectedCube.y }),
          overlap:
            selectedCube.y < cube.y + cube.height &&
            selectedCube.y + selectedCube.height > cube.y,
        },
        {
          // Правая сторона к левой
          condition:
            Math.abs(selectedCube.x + selectedCube.width - cube.x) <=
            SNAP_DISTANCE,
          adjust: () => ({ x: cube.x - selectedCube.width, y: selectedCube.y }),
          overlap:
            selectedCube.y < cube.y + cube.height &&
            selectedCube.y + selectedCube.height > cube.y,
        },
        {
          // Верхняя сторона к нижней
          condition:
            Math.abs(selectedCube.y - (cube.y + cube.height)) <= SNAP_DISTANCE,
          adjust: () => ({ x: selectedCube.x, y: cube.y + cube.height }),
          overlap:
            selectedCube.x < cube.x + cube.width &&
            selectedCube.x + selectedCube.width > cube.x,
        },
        {
          // Нижняя сторона к верхней
          condition:
            Math.abs(selectedCube.y + selectedCube.height - cube.y) <=
            SNAP_DISTANCE,
          adjust: () => ({
            x: selectedCube.x,
            y: cube.y - selectedCube.height,
          }),
          overlap:
            selectedCube.x < cube.x + cube.width &&
            selectedCube.x + selectedCube.width > cube.x,
        },
      ];

      for (const side of sides) {
        if (side.condition && side.overlap) {
          const adjustedPosition = side.adjust();

          newGroup = {
            mainId: selectedCube.id,
            cubeIds: [selectedCube.id, cube.id],
          };

          const updatedCubesWithAdjustment = currentCubes.map((c) => {
            if (c.id === selectedCube.id) {
              return { ...c, x: adjustedPosition.x, y: adjustedPosition.y };
            }
            return c;
          });

          setCubes(updatedCubesWithAdjustment);
          break;
        }
      }
    });

    if (newGroup) {
      setStuckGroup(newGroup);
    }
  };

  const separateCubes = () => {
    if (!stuckGroup) return;

    const updatedCubes = [...cubes];

    stuckGroup.cubeIds.forEach((cubeId) => {
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
    setStuckGroup(null);
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
  }, [isDragging, cubes, selectedCube, dragOffset, stuckGroup]);

  return (
    <div className="app">
      <h1>Интерактивные кубики (React)</h1>

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
          disabled={!stuckGroup}
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
            className={`cube ${cube.isSelected ? "selected" : ""} ${
              stuckGroup && stuckGroup.cubeIds.includes(cube.id) ? "stuck" : ""
            }`}
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
