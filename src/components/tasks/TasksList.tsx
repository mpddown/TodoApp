import { useTheme } from "@emotion/react";
import {
  CancelRounded,
  Close,
  Delete,
  DeleteRounded,
  DoneAll,
  Search,
  RadioButtonChecked,
  MoreVert,
} from "@mui/icons-material";
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  InputAdornment,
  Tooltip,
} from "@mui/material";
import { useCallback, useContext, useEffect, useMemo, useState, memo, useRef } from "react";
import { CategoryBadge, CustomDialogTitle, EditTask, TaskItem } from "..";
import { TaskContext } from "../../contexts/TaskContext";
import { UserContext } from "../../contexts/UserContext";
import { useResponsiveDisplay } from "../../hooks/useResponsiveDisplay";
import { useStorageState } from "../../hooks/useStorageState";
import { DialogBtn } from "../../styles";
import { ColorPalette } from "../../theme/themeConfig";
import type { Category, Task, UUID } from "../../types/user";
import { getFontColor, showToast } from "../../utils";
import {
  NoTasks,
  RingAlarm,
  SearchClear,
  SearchInput,
  SelectedTasksContainer,
  TasksContainer,
  CategoriesListContainer,
  TaskNotFound,
} from "./tasks.styled";
import { TaskMenu } from "./TaskMenu";
import { TaskIcon } from "../TaskIcon";
import { useToasterStore } from "react-hot-toast";
import { TaskSort } from "./TaskSort";
import { useTranslation } from "../../hooks/useTranslation";

const TaskMenuButton = memo(
  ({ task, onClick }: { task: Task; onClick: (event: React.MouseEvent<HTMLElement>) => void }) => (
    <IconButton
      aria-label="Task Menu"
      aria-controls="task-menu"
      aria-haspopup="true"
      onClick={onClick}
      sx={{ color: getFontColor(task.color) }}
    >
      <MoreVert />
    </IconButton>
  ),
);

/**
 * Component to display a list of tasks.
 */
export const TasksList: React.FC = () => {
  const { user, setUser } = useContext(UserContext);
  const {
    selectedTaskId,
    setSelectedTaskId,
    anchorEl,
    setAnchorEl,
    setAnchorPosition,
    expandedTasks,
    toggleShowMore,
    search,
    setSearch,
    highlightMatchingText,
    multipleSelectedTasks,
    setMultipleSelectedTasks,
    handleSelectTask,
    editModalOpen,
    setEditModalOpen,
    deleteDialogOpen,
    setDeleteDialogOpen,
    sortOption,
  } = useContext(TaskContext);
  const open = Boolean(anchorEl);

  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const [deleteSelectedOpen, setDeleteSelectedOpen] = useState<boolean>(false);
  const [categories, setCategories] = useState<Category[] | undefined>(undefined);
  const [selectedCatId, setSelectedCatId] = useStorageState<UUID | undefined>(
    undefined,
    "selectedCategory",
    "sessionStorage",
  );
  const [categoryCounts, setCategoryCounts] = useState<{
    [categoryId: UUID]: number;
  }>({});
  const searchRef = useRef<HTMLInputElement>(null);

  const isMobile = useResponsiveDisplay();
  const theme = useTheme();
  const { toasts } = useToasterStore();
  const { t } = useTranslation();

  const listFormat = useMemo(
    () =>
      new Intl.ListFormat("he-IL", {
        style: "long",
        type: "conjunction",
      }),
    [],
  );

  // Handler for clicking the more options button in a task
  const handleClick = (event: React.MouseEvent<HTMLElement>, taskId: UUID) => {
    setAnchorEl(event.currentTarget);
    setSelectedTaskId(taskId);
    const target = event.target as HTMLElement;
    // Position the menu where the click event occurred
    if (target.tagName !== "BUTTON") {
      setAnchorPosition({
        top: event.clientY,
        left: event.clientX,
      });
    } else {
      setAnchorPosition(null);
    }
    if (!isMobile && !expandedTasks.has(taskId)) {
      toggleShowMore(taskId);
    }
  };
  // focus search input on ctrl + /
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const reorderTasks = useCallback(
    (tasks: Task[]): Task[] => {
      // Separate tasks into pinned and unpinned
      let pinnedTasks = tasks.filter((task) => task.pinned);
      let unpinnedTasks = tasks.filter((task) => !task.pinned);

      // Filter tasks based on the selected category
      if (selectedCatId !== undefined) {
        const categoryFilter = (task: Task) =>
          task.category?.some((category) => category.id === selectedCatId) ?? false;
        unpinnedTasks = unpinnedTasks.filter(categoryFilter);
        pinnedTasks = pinnedTasks.filter(categoryFilter);
      }

      // Filter tasks based on the search input
      const searchLower = search.toLowerCase();
      const searchFilter = (task: Task) =>
        task.name.toLowerCase().includes(searchLower) ||
        (task.description && task.description.toLowerCase().includes(searchLower));
      unpinnedTasks = unpinnedTasks.filter(searchFilter);
      pinnedTasks = pinnedTasks.filter(searchFilter);

      // Sort tasks based on the selected sort option
      const sortTasks = (tasks: Task[]) => {
        switch (sortOption) {
          case "dateCreated":
            return [...tasks];
          case "dueDate":
            return [...tasks].sort((a, b) => {
              if (!a.deadline) return 1;
              if (!b.deadline) return -1;
              return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
            });
          case "alphabetical":
            return [...tasks].sort((a, b) => a.name.localeCompare(b.name));
          default:
            return tasks;
        }
      };

      unpinnedTasks = sortTasks(unpinnedTasks);
      pinnedTasks = sortTasks(pinnedTasks);

      // Move done tasks to bottom if the setting is enabled
      if (user.settings?.doneToBottom) {
        const doneTasks = unpinnedTasks.filter((task) => task.done);
        const notDoneTasks = unpinnedTasks.filter((task) => !task.done);
        return [...pinnedTasks, ...notDoneTasks, ...doneTasks];
      }

      return [...pinnedTasks, ...unpinnedTasks];
    },
    [search, selectedCatId, user.settings?.doneToBottom, sortOption],
  );

  const orderedTasks = useMemo(() => reorderTasks(user.tasks), [user.tasks, reorderTasks]);

  const confirmDeleteTask = () => {
    if (!selectedTaskId) {
      return;
    }
    const updatedTasks = user.tasks.filter((task) => task.id !== selectedTaskId);
    setUser((prevUser) => ({
      ...prevUser,
      tasks: updatedTasks,
    }));
    user.deletedTasks.push(selectedTaskId);
    setDeleteDialogOpen(false);
    showToast(
      <div>
        נמחקה משימה - <b translate="no">{taskToDelete?.name}</b>
      </div>,
    );
    setTaskToDelete(null);
  };

  useEffect(() => {
    if (selectedTaskId && deleteDialogOpen) {
      const task = user.tasks.find((t) => t.id === selectedTaskId);
      setTaskToDelete(task || null);
    }
  }, [selectedTaskId, deleteDialogOpen, user.tasks]);

  const cancelDeleteTask = () => {
    // Cancels the delete task operation
    setDeleteDialogOpen(false);
  };

  const handleMarkSelectedAsDone = () => {
    setUser((prevUser) => ({
      ...prevUser,
      tasks: prevUser.tasks.map((task) => {
        if (multipleSelectedTasks.includes(task.id)) {
          // Mark the task as done if selected
          return { ...task, done: true, lastSave: new Date() };
        }
        return task;
      }),
    }));
    // Clear the selected task IDs after the operation
    setMultipleSelectedTasks([]);
  };

  const handleDeleteSelected = () => setDeleteSelectedOpen(true);

  useEffect(() => {
    const tasks: Task[] = orderedTasks;
    const uniqueCategories: Category[] = [];

    tasks.forEach((task) => {
      if (task.category) {
        task.category.forEach((category) => {
          if (!uniqueCategories.some((c) => c.id === category.id)) {
            uniqueCategories.push(category);
          }
        });
      }
    });

    // Calculate category counts
    const counts: { [categoryId: UUID]: number } = {};
    uniqueCategories.forEach((category) => {
      const categoryTasks = tasks.filter((task) =>
        task.category?.some((cat) => cat.id === category.id),
      );
      counts[category.id] = categoryTasks.length;
    });

    // sort categories by count (descending) then by name (ascending) if counts are equal
    uniqueCategories.sort((a, b) => {
      const countA = counts[a.id] || 0;
      const countB = counts[b.id] || 0;

      if (countB !== countA) {
        return countB - countA;
      }

      return (a.name || "").localeCompare(b.name || "");
    });

    setCategories(uniqueCategories);
    setCategoryCounts(counts);
  }, [user.tasks, search, setCategories, setCategoryCounts, orderedTasks]);

  const checkOverdueTasks = useCallback(
    (tasks: Task[]) => {
      if (location.pathname === "/share") {
        return;
      }

      const overdueTasks = tasks.filter(
        (task) => task.deadline && new Date() > new Date(task.deadline) && !task.done,
      );

      if (overdueTasks.length > 0) {
        const taskNames = overdueTasks.map((task) => task.name);

        showToast(
          <div translate="no" style={{ wordBreak: "break-word" }}>
            <b translate="yes">משימה{overdueTasks.length > 1 && "ות"} באיחור: </b>
            {listFormat.format(taskNames)}
          </div>,
          {
            id: "overdue-tasks",
            type: "error",
            disableVibrate: true,
            preventDuplicate: true,
            visibleToasts: toasts,
            duration: 3400,
            icon: <RingAlarm animate sx={{ color: ColorPalette.red }} />,
            style: {
              borderColor: ColorPalette.red,
              boxShadow: user.settings.enableGlow ? `0 0 18px -8px ${ColorPalette.red}` : "none",
            },
          },
        );
      }
    },
    [listFormat, toasts, user.settings.enableGlow],
  );

  useEffect(() => {
    checkOverdueTasks(user.tasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <TaskMenu />
      <TasksContainer>
        {user.tasks.length > 0 && (
          <Box sx={{ display: "flex", alignItems: "center", gap: "10px", mb: "8px" }}>
            <SearchInput
              inputRef={searchRef}
              color="primary"
              placeholder="חפש משימה..."
              autoComplete="off"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: "white" }} />
                    </InputAdornment>
                  ),
                  endAdornment: search ? (
                    <InputAdornment position="end">
                      <SearchClear
                        color={
                          orderedTasks.length === 0 && user.tasks.length > 0 ? "error" : "default"
                        }
                        onClick={() => setSearch("")}
                      >
                        <Close
                          sx={{
                            color:
                              orderedTasks.length === 0 && user.tasks.length > 0
                                ? `${ColorPalette.red} !important`
                                : "white",
                            transition: ".3s all",
                          }}
                        />
                      </SearchClear>
                    </InputAdornment>
                  ) : undefined,
                },
              }}
            />
            <TaskSort />
          </Box>
        )}
        {categories !== undefined && categories?.length > 0 && user.settings.enableCategories && (
          <CategoriesListContainer>
            {categories?.map((cat) => (
              <CategoryBadge
                key={cat.id}
                category={cat}
                emojiSizes={[24, 20]}
                list={"true"}
                label={
                  <div>
                    <span style={{ fontWeight: "bold" }}>{cat.name}</span>
                    <span
                      style={{
                        fontSize: "14px",
                        opacity: 0.9,
                        marginLeft: "4px",
                      }}
                    >
                      ({categoryCounts[cat.id]})
                    </span>
                  </div>
                }
                onClick={() =>
                  selectedCatId !== cat.id ? setSelectedCatId(cat.id) : setSelectedCatId(undefined)
                }
                onDelete={selectedCatId === cat.id ? () => setSelectedCatId(undefined) : undefined}
                deleteIcon={<CancelRounded />}
                sx={{
                  boxShadow: "none",
                  display:
                    selectedCatId === undefined || selectedCatId === cat.id
                      ? "inline-flex"
                      : "none",
                  p: "20px 14px",
                  fontSize: "16px",
                }}
              />
            ))}
          </CategoriesListContainer>
        )}
        {multipleSelectedTasks.length > 0 && (
          <SelectedTasksContainer>
            <div>
              <h3>
                <RadioButtonChecked /> &nbsp; נבחרו {multipleSelectedTasks.length} משימ
                {multipleSelectedTasks.length > 1 ? "ות" : "ה"}
              </h3>
              <span translate="no" style={{ fontSize: "14px", opacity: 0.8 }}>
                {listFormat.format(
                  multipleSelectedTasks
                    .map((taskId) => user.tasks.find((task) => task.id === taskId)?.name)
                    .filter((taskName) => taskName !== undefined) as string[],
                )}
              </span>
            </div>
            {/* TODO: add more features */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Tooltip title="סמן נבחרות כהושלמו">
                <IconButton
                  sx={{ color: getFontColor(theme.secondary) }}
                  size="large"
                  onClick={handleMarkSelectedAsDone}
                >
                  <DoneAll />
                </IconButton>
              </Tooltip>
              <Tooltip title="מחק נבחרות">
                <IconButton color="error" size="large" onClick={handleDeleteSelected}>
                  <Delete />
                </IconButton>
              </Tooltip>
              <Tooltip sx={{ color: getFontColor(theme.secondary) }} title="בטל">
                <IconButton size="large" onClick={() => setMultipleSelectedTasks([])}>
                  <CancelRounded />
                </IconButton>
              </Tooltip>
            </div>
          </SelectedTasksContainer>
        )}
        {search && orderedTasks.length > 1 && user.tasks.length > 0 && (
          <div
            style={{
              textAlign: "center",
              fontSize: "18px",
              opacity: 0.9,
              marginTop: "12px",
            }}
          >
            <b>
              נמצאו {orderedTasks.length} משימ
              {orderedTasks.length > 1 ? "ות" : "ה"}
            </b>
          </div>
        )}
        {user.tasks.length !== 0 ? (
          orderedTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              features={{
                enableLinks: true,
                enableGlow: user.settings.enableGlow,
                enableSelection: true,
              }}
              selection={{
                selectedIds: multipleSelectedTasks,
                onSelect: handleSelectTask,
                onDeselect: (taskId) =>
                  setMultipleSelectedTasks((prevTasks) => prevTasks.filter((id) => id !== taskId)),
              }}
              onContextMenu={(e: React.MouseEvent<Element>) => {
                e.preventDefault();
                handleClick(e as unknown as React.MouseEvent<HTMLElement>, task.id);
              }}
              actions={
                <TaskMenuButton task={task} onClick={(event) => handleClick(event, task.id)} />
              }
              blur={selectedTaskId !== task.id && open && !isMobile}
              textHighlighter={highlightMatchingText}
            />
          ))
        ) : (
          <NoTasks>
            <span>{t("home.tasks.noTasksYet")}</span>
            <br />
            {t("home.tasks.clickToAdd")}
          </NoTasks>
        )}
        {search && orderedTasks.length === 0 && user.tasks.length > 0 ? (
          <TaskNotFound>
            <b>לא נמצאו משימות</b>
            <br />
            נסה לחפש עם מילות מפתח אחרות.
            <div style={{ marginTop: "14px" }}>
              <TaskIcon scale={0.8} />
            </div>
          </TaskNotFound>
        ) : null}
        <EditTask
          open={editModalOpen}
          task={user.tasks.find((task) => task.id === selectedTaskId)}
          onClose={() => setEditModalOpen(false)}
        />
      </TasksContainer>
      <Dialog open={deleteDialogOpen} onClose={cancelDeleteTask}>
        <CustomDialogTitle
          title="מחק משימה"
          subTitle="האם אתה בטוח שברצונך למחוק את המשימה הזו?"
          onClose={cancelDeleteTask}
          icon={<Delete />}
        />
        <DialogContent>
          {taskToDelete && (
            <TaskItem
              task={taskToDelete}
              features={{
                enableGlow: false,
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <DialogBtn onClick={cancelDeleteTask} color="primary">
            {t("common.cancel")}
          </DialogBtn>
          <DialogBtn onClick={confirmDeleteTask} color="error">
            <DeleteRounded /> &nbsp; אשר מחיקה
          </DialogBtn>
        </DialogActions>
      </Dialog>
      <Dialog open={deleteSelectedOpen}>
        <CustomDialogTitle
          title="מחק משימות נבחרות"
          subTitle="אשר כדי למחוק את המשימות הנבחרות"
          icon={<DeleteRounded />}
        />
        <DialogContent translate="no">
          {listFormat.format(
            multipleSelectedTasks
              .map((taskId) => user.tasks.find((task) => task.id === taskId)?.name)
              .filter((taskName) => taskName !== undefined) as string[],
          )}
        </DialogContent>
        <DialogActions>
          <DialogBtn onClick={() => setDeleteSelectedOpen(false)} color="primary">
            {t("common.cancel")}
          </DialogBtn>
          <DialogBtn
            onClick={() => {
              setUser((prevUser) => ({
                ...prevUser,
                tasks: prevUser.tasks.filter((task) => !multipleSelectedTasks.includes(task.id)),
                deletedTasks: [
                  ...(prevUser.deletedTasks || []),
                  ...multipleSelectedTasks.filter((id) => !prevUser.deletedTasks?.includes(id)),
                ],
              }));
              // Clear the selected task IDs after the operation
              setMultipleSelectedTasks([]);
              setDeleteSelectedOpen(false);
            }}
            color="error"
          >
            {t("common.delete")}
          </DialogBtn>
        </DialogActions>
      </Dialog>
    </>
  );
};