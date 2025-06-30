// Main Home component
import { useContext, useMemo, lazy, Suspense, useEffect } from "react";
import {
  AddButton,
  GreetingHeader,
  Offline,
  ProgressPercentageContainer,
  StyledProgress,
  TaskCompletionText,
  TaskCountHeader,
  TaskCountTextContainer,
  TasksCount,
  TasksCountContainer,
} from "../styles";

import { Emoji } from "emoji-picker-react";
import { Box, CircularProgress, Tooltip, Typography } from "@mui/material";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { AddRounded, TodayRounded, WifiOff } from "@mui/icons-material";
import { UserContext } from "../contexts/UserContext";
import { useResponsiveDisplay } from "../hooks/useResponsiveDisplay";
import { useNavigate } from "react-router-dom";
import { TaskProvider } from "../contexts/TaskProvider";
import { AnimatedGreeting } from "../components/AnimatedGreeting";
import { useTranslation } from "../hooks/useTranslation";

const TasksList = lazy(() =>
  import("../components/tasks/TasksList").then((module) => ({ default: module.TasksList })),
);

const Home = () => {
  const { user } = useContext(UserContext);
  const { tasks, emojisStyle, settings, name } = user;
  const { t } = useTranslation();

  const isOnline = useOnlineStatus();
  const n = useNavigate();
  const isMobile = useResponsiveDisplay();

  // Calculate these values only when tasks change
  const taskStats = useMemo(() => {
    const completedCount = tasks.filter((task) => task.done).length;
    const completedPercentage = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

    const today = new Date().setHours(0, 0, 0, 0);
    const dueTodayTasks = tasks.filter((task) => {
      if (task.deadline) {
        const taskDeadline = new Date(task.deadline).setHours(0, 0, 0, 0);
        return taskDeadline === today && !task.done;
      }
      return false;
    });

    const taskNamesDueToday = dueTodayTasks.map((task) => task.name);

    return {
      completedTasksCount: completedCount,
      completedTaskPercentage: completedPercentage,
      tasksWithDeadlineTodayCount: dueTodayTasks.length,
      tasksDueTodayNames: taskNamesDueToday,
    };
  }, [tasks]);

  // Memoize time-based greeting
  const timeGreeting = useMemo(() => {
    const currentHour = new Date().getHours();
    if (currentHour < 12 && currentHour >= 5) {
      return t("home.greeting.goodMorning");
    } else if (currentHour < 18 && currentHour > 12) {
      return t("home.greeting.goodAfternoon");
    } else {
      return t("home.greeting.goodEvening");
    }
  }, [t]);

  // Memoize task completion text
  const taskCompletionText = useMemo(() => {
    const percentage = taskStats.completedTaskPercentage;
    switch (true) {
      case percentage === 0:
        return t("home.tasks.noTasksCompleted");
      case percentage === 100:
        return t("home.tasks.allTasksCompleted");
      case percentage >= 75:
        return t("home.tasks.almostThere");
      case percentage >= 50:
        return t("home.tasks.halfwayThere");
      case percentage >= 25:
        return t("home.tasks.goodProgress");
      default:
        return t("home.tasks.justGettingStarted");
    }
  }, [taskStats.completedTaskPercentage, t]);

  useEffect(() => {
    document.title = "Todo App";
  }, []);

  return (
    <>
      <GreetingHeader>
        <Emoji unified="1f44b" emojiStyle={emojisStyle} /> &nbsp; {timeGreeting}
        {name && (
          <span translate="no">
            , <span>{name}</span>
          </span>
        )}
      </GreetingHeader>

      <AnimatedGreeting />

      {!isOnline && (
        <Offline>
          <WifiOff /> {t("home.offline")}
        </Offline>
      )}
      {tasks.length > 0 && (
        <TasksCountContainer>
          <TasksCount glow={settings.enableGlow}>
            <Box sx={{ position: "relative", display: "inline-flex" }}>
              <StyledProgress
                variant="determinate"
                value={taskStats.completedTaskPercentage}
                size={64}
                thickness={5}
                aria-label="Progress"
                glow={settings.enableGlow}
              />

              <ProgressPercentageContainer
                glow={settings.enableGlow && taskStats.completedTaskPercentage > 0}
              >
                <Typography
                  variant="caption"
                  component="div"
                  color="white"
                  sx={{ fontSize: "16px", fontWeight: 600 }}
                >{`${Math.round(taskStats.completedTaskPercentage)}%`}</Typography>
              </ProgressPercentageContainer>
            </Box>
            <TaskCountTextContainer>
              <TaskCountHeader>
                {taskStats.completedTasksCount === 0
                  ? `${t("home.tasks.youHave")} ${tasks.length} ${tasks.length > 1 ? t("home.tasks.tasks") : t("home.tasks.task")} ${t("home.tasks.toComplete")}.`
                  : `${t("home.tasks.youCompleted")} ${taskStats.completedTasksCount} ${t("home.tasks.outOf")} ${tasks.length} ${tasks.length > 1 ? t("home.tasks.tasks") : t("home.tasks.task")}.`}
              </TaskCountHeader>
              <TaskCompletionText>{taskCompletionText}</TaskCompletionText>
              {taskStats.tasksWithDeadlineTodayCount > 0 && (
                <span
                  style={{
                    opacity: 0.8,
                    display: "inline-block",
                  }}
                >
                  <TodayRounded sx={{ fontSize: "20px", verticalAlign: "middle" }} />
                  &nbsp;{t("home.tasks.tasksDueToday")}&nbsp;
                  <span translate="no">
                    {new Intl.ListFormat("he", { style: "long" }).format(
                      taskStats.tasksDueTodayNames,
                    )}
                  </span>
                </span>
              )}
            </TaskCountTextContainer>
          </TasksCount>
        </TasksCountContainer>
      )}
      <Suspense
        fallback={
          <Box display="flex" justifyContent="center" alignItems="center">
            <CircularProgress />
          </Box>
        }
      >
        <TaskProvider>
          <TasksList />
        </TaskProvider>
      </Suspense>
      {!isMobile && (
        <Tooltip title={tasks.length > 0 ? t("home.tasks.addNewTask") : t("home.tasks.addTask")} placement="left">
          <AddButton
            animate={tasks.length === 0}
            glow={settings.enableGlow}
            onClick={() => n("add")}
            aria-label={t("home.tasks.addTask")}
          >
            <AddRounded style={{ fontSize: "44px" }} />
          </AddButton>
        </Tooltip>
      )}
    </>
  );
};

export default Home;