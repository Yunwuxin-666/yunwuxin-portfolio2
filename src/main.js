import { Experience } from "./Experience/Experience";
import "./style.css";

const experience = new Experience();


const btn = document.getElementById("day-night-toggle");
const icon = btn.querySelector(".day-night-btn__icon");

btn.addEventListener("click", async () => {
  const room = experience.world?.room;
  if (!room || btn.disabled) return;
  if (!room.nightReady) {
    btn.disabled = true;
    btn.setAttribute("aria-busy", "true");
    btn.setAttribute("aria-label", "正在加载夜景");
    icon.textContent = "…";
    try {
      await room.prepareNight();
    } catch {
      icon.textContent = "☾";
      btn.title = "夜景加载失败，点击重试";
      btn.setAttribute("aria-label", btn.title);
      return;
    } finally {
      btn.disabled = false;
      btn.removeAttribute("aria-busy");
    }
  }
  room.toggleDayNight();
  const goingNight = room.isNight;
  btn.setAttribute("aria-pressed", String(goingNight));
  btn.title = goingNight ? "切换至白天" : "切换至夜晚";
  btn.setAttribute("aria-label", btn.title);
  icon.innerHTML = goingNight ? "&#9728;" : "&#9790;";
  experience.world.raycaster?.setDayNightVolume(goingNight);
});
