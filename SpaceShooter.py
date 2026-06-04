import json
import math
import os
import random
import sys
from dataclasses import dataclass

import pygame

pygame.init()
try:
    pygame.mixer.init()
except Exception:
    pass

W, H = 800, 600
FPS = 60
SAVE_FILE = "neon_overdrive_save.json"

BLACK = (10, 10, 15)
WHITE = (255, 255, 255)
NEON_GREEN = (57, 255, 20)
NEON_RED = (255, 7, 58)
NEON_BLUE = (0, 245, 255)
NEON_YELLOW = (255, 223, 0)
NEON_PURPLE = (190, 110, 255)
NEON_ORANGE = (255, 150, 60)
NEON_PINK = (255, 110, 185)
NEON_CYAN = (120, 240, 255)
NEON_LIME = (190, 255, 70)
DARK_PANEL = (18, 18, 28)

screen = pygame.display.set_mode((W, H))
pygame.display.set_caption("▲ STARFIGHTER: NEON OVERDRIVE ▲")
clock = pygame.time.Clock()
font_title = pygame.font.SysFont("courier", 50, bold=True)
font_sub = pygame.font.SysFont("courier", 24)
font_score = pygame.font.SysFont("courier", 20, bold=True)
font_small = pygame.font.SysFont("courier", 16)

STATE_MENU = 0
STATE_GAMEPLAY = 1
STATE_GAMEOVER = 2
STATE_SHOP = 3
state = STATE_MENU

DEFAULT_SAVE = {
    "coins": 0,
    "total_kills": 0,
    "highest_wave": 1,
    "games_played": 0,
    "lifetime_coins": 0,
    "upgrades": {
        "damage": 0,
        "fire_rate": 0,
        "speed": 0,
        "shield": 0,
        "multishot": 0,
        "pierce": 0,
    },
}


def clone_default():
    return json.loads(json.dumps(DEFAULT_SAVE))


def load_save():
    if not os.path.exists(SAVE_FILE):
        return clone_default()
    try:
        with open(SAVE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        s = clone_default()
        for k in ["coins", "total_kills", "highest_wave", "games_played", "lifetime_coins"]:
            s[k] = data.get(k, s[k])
        s["upgrades"].update(data.get("upgrades", {}))
        return s
    except Exception:
        return clone_default()


game_save = load_save()


def save_game():
    with open(SAVE_FILE, "w", encoding="utf-8") as f:
        json.dump(game_save, f, indent=2)


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def randf(a, b):
    return random.uniform(a, b)


def weighted_choice(items):
    total = sum(w for _, w in items)
    roll = random.uniform(0, total)
    cur = 0
    for v, w in items:
        cur += w
        if roll <= cur:
            return v
    return items[-1][0]


def draw_text(text, font, color, x, y):
    surf = font.render(text, True, color)
    rect = surf.get_rect(center=(x, y))
    screen.blit(surf, rect)


class Starfield:
    def __init__(self):
        self.stars = [[random.randint(0, W), random.randint(0, H), randf(1, 4)] for _ in range(120)]

    def draw(self, dt):
        for s in self.stars:
            s[1] += s[2]
            if s[1] > H:
                s[1] = 0
                s[0] = random.randint(0, W)
            pygame.draw.circle(screen, WHITE, (int(s[0]), int(s[1])), 1)


class Particle:
    def __init__(self, x, y, color, vx, vy, life, size=2):
        self.x = float(x)
        self.y = float(y)
        self.color = color
        self.vx = float(vx)
        self.vy = float(vy)
        self.life = float(life)
        self.max_life = float(life)
        self.size = size

    def update(self, dt):
        self.x += self.vx * dt
        self.y += self.vy * dt
        self.vx *= 0.99
        self.vy *= 0.99
        self.life -= dt

    def draw(self):
        alpha = clamp(self.life / self.max_life, 0, 1)
        surf = pygame.Surface((self.size * 2 + 2, self.size * 2 + 2), pygame.SRCALPHA)
        pygame.draw.circle(surf, (*self.color, int(255 * alpha)), (self.size + 1, self.size + 1), self.size)
        screen.blit(surf, (self.x - self.size, self.y - self.size))


class Bullet:
    def __init__(self, x, y, vx=0, vy=-8, damage=1, color=NEON_GREEN, pierce=0):
        self.x = float(x)
        self.y = float(y)
        self.vx = float(vx)
        self.vy = float(vy)
        self.damage = damage
        self.color = color
        self.pierce = pierce
        self.radius = 4

    def update(self, dt):
        self.x += self.vx * dt * 60
        self.y += self.vy * dt * 60

    def draw(self):
        pygame.draw.circle(screen, self.color, (int(self.x), int(self.y)), self.radius)


class EnemyBullet:
    def __init__(self, x, y, vx, vy, color=NEON_RED):
        self.x = float(x)
        self.y = float(y)
        self.vx = float(vx)
        self.vy = float(vy)
        self.color = color
        self.radius = 4

    def update(self, dt):
        self.x += self.vx * dt * 60
        self.y += self.vy * dt * 60

    def draw(self):
        pygame.draw.circle(screen, self.color, (int(self.x), int(self.y)), self.radius)


class Meteor:
    def __init__(self, x, y, vx, vy, radius=10, damage=1):
        self.x = float(x)
        self.y = float(y)
        self.vx = float(vx)
        self.vy = float(vy)
        self.r = radius
        self.damage = damage
        self.spin = randf(-3, 3)
        self.alive = True

    def update(self, dt):
        self.x += self.vx * dt * 60
        self.y += self.vy * dt * 60
        self.spin += 0.1
        if self.y > H + 60:
            self.alive = False

    def draw(self):
        pygame.draw.circle(screen, NEON_ORANGE, (int(self.x), int(self.y)), self.r)
        pygame.draw.circle(screen, NEON_YELLOW, (int(self.x) - 3, int(self.y) - 3), max(2, self.r // 3))


class Player:
    def __init__(self):
        self.w = 40
        self.h = 40
        self.x = W // 2 - self.w // 2
        self.y = H - 70
        self.speed = 6
        self.cooldown = 0
        self.invuln = 0
        self.jam_timer = 0
        self.lives = 3
        self.shield = 0
        self.max_shield = 0
        self.damage = 1
        self.fire_rate = 15
        self.multishot = 1
        self.pierce = 0
        self.boost = 1.0

    def sync_upgrades(self):
        u = game_save["upgrades"]
        self.damage = 1 + u["damage"]
        self.fire_rate = max(4, 15 - u["fire_rate"] * 2)
        self.speed = 6 + u["speed"]
        self.max_shield = 3 + u["shield"]
        self.shield = self.max_shield
        self.multishot = 1 + u["multishot"]
        self.pierce = u["pierce"]

    def rect(self):
        return pygame.Rect(int(self.x), int(self.y), self.w, self.h)

    def update(self):
        keys = pygame.key.get_pressed()
        if keys[pygame.K_LEFT]:
            self.x -= self.speed
        if keys[pygame.K_RIGHT]:
            self.x += self.speed
        self.x = clamp(self.x, 0, W - self.w)
        if self.cooldown > 0:
            self.cooldown -= 1
        if self.invuln > 0:
            self.invuln -= 1
        if self.jam_timer > 0:
            self.jam_timer -= 1
        if keys[pygame.K_SPACE] and self.cooldown <= 0 and self.jam_timer <= 0 and current_state == STATE_GAMEPLAY:
            self.shoot()

    def shoot(self):
        global bullets
        offsets = {1: [0], 2: [-10, 10], 3: [-16, 0, 16]}.get(self.multishot, [-20, -8, 8, 20])
        for off in offsets:
            bullets.append(Bullet(self.x + self.w / 2 + off, self.y, vx=off * 0.05, vy=-8, damage=self.damage, color=NEON_GREEN if off % 2 == 0 else NEON_YELLOW, pierce=self.pierce))
        self.cooldown = max(4, int(self.fire_rate * current_fire_slow_mult))

    def hit(self, amount=1):
        if self.invuln > 0:
            return False
        if self.shield > 0:
            self.shield -= amount
        else:
            self.lives -= amount
        self.invuln = 45
        return self.lives <= 0

    def draw(self):
        if self.invuln > 0 and (self.invuln // 5) % 2 == 0:
            return
        pts = [(self.x + self.w / 2, self.y), (self.x, self.y + self.h), (self.x + self.w, self.y + self.h)]
        pygame.draw.polygon(screen, NEON_BLUE, pts, 2)
        pygame.draw.polygon(screen, WHITE, [(p[0], p[1] + 5 if i == 0 else p[1] + 2) for i, p in enumerate(pts)], 0)
        pygame.draw.rect(screen, NEON_YELLOW, (self.x + 14, self.y + 28, 12, 4))


@dataclass
class EnemySpec:
    hp: int
    speed: float
    reward: int
    color: tuple
    outline: tuple
    size: tuple
    dive: float = 0.0
    shoot: float = 0.0
    can_split: bool = False
    can_shield: bool = False
    can_heal: bool = False
    can_reflect: bool = False
    can_jam: bool = False
    can_bomb: bool = False
    can_phantom: bool = False
    can_leech: bool = False
    can_command: bool = False
    can_gate: bool = False
    can_teleport: bool = False


ENEMY_COST = {
    "scout": 1, "zigzag": 2, "tank": 5, "sniper": 3, "splitter": 4, "shielded": 5,
    "healer": 4, "hunter": 5, "mine": 2, "jammer": 4, "reflector": 5, "bomber": 5,
    "phantom": 4, "leech": 6, "commander": 7, "warp_gate": 8, "teleporter": 6,
}

ENEMY_TYPES = {
    "scout": EnemySpec(1, 1.9, 1, NEON_RED, WHITE, (30, 30), dive=0.01),
    "zigzag": EnemySpec(2, 1.7, 2, NEON_PINK, WHITE, (32, 32), dive=0.03),
    "tank": EnemySpec(6, 1.0, 6, NEON_ORANGE, WHITE, (42, 36), shoot=0.02),
    "sniper": EnemySpec(3, 1.4, 4, NEON_CYAN, WHITE, (32, 28), shoot=0.05),
    "splitter": EnemySpec(4, 1.5, 5, NEON_LIME, WHITE, (34, 34), can_split=True, dive=0.03),
    "shielded": EnemySpec(5, 1.2, 6, NEON_PURPLE, WHITE, (38, 38), can_shield=True, shoot=0.03),
    "healer": EnemySpec(3, 1.4, 5, (110, 255, 200), WHITE, (34, 30), can_heal=True, shoot=0.01),
    "hunter": EnemySpec(4, 1.8, 6, (255, 90, 90), WHITE, (36, 32), dive=0.06),
    "mine": EnemySpec(2, 0.8, 3, (255, 220, 90), WHITE, (26, 26)),
    "jammer": EnemySpec(4, 1.5, 5, (255, 120, 220), WHITE, (34, 32), shoot=0.02, can_jam=True),
    "reflector": EnemySpec(5, 1.2, 6, (140, 220, 255), WHITE, (36, 36), can_shield=True, can_reflect=True),
    "bomber": EnemySpec(5, 1.3, 6, (255, 180, 70), WHITE, (36, 34), can_bomb=True, dive=0.04),
    "phantom": EnemySpec(4, 1.6, 6, (180, 130, 255), WHITE, (34, 30), can_phantom=True, dive=0.05),
    "leech": EnemySpec(5, 1.4, 7, (120, 255, 170), WHITE, (34, 32), can_leech=True, shoot=0.01),
    "commander": EnemySpec(7, 1.2, 8, (255, 255, 120), WHITE, (38, 34), can_command=True, shoot=0.03),
    "warp_gate": EnemySpec(8, 0.6, 10, (180, 255, 255), WHITE, (40, 40), can_gate=True),
    "teleporter": EnemySpec(5, 1.7, 6, (255, 150, 255), WHITE, (34, 34), can_teleport=True, shoot=0.02),
}

FORMATION_TEMPLATES = [
    {"name": "grid_swarm", "pattern": "grid", "min_wave": 1, "matrix": [["scout", "zigzag", "scout", "zigzag"], ["scout", "scout", "zigzag", "scout"]]},
    {"name": "shield_wall", "pattern": "wall", "min_wave": 3, "matrix": [["shielded", "tank", "tank", "shielded"], ["sniper", "sniper", "sniper", "sniper"]]},
    {"name": "escort", "pattern": "escort", "min_wave": 4, "matrix": [["hunter", "commander", "hunter"], ["scout", "sniper", "scout"]]},
    {"name": "hive_cluster", "pattern": "hive", "min_wave": 5, "matrix": [["warp_gate", "leech", "warp_gate"], ["splitter", "scout", "splitter"]]},
    {"name": "pincer", "pattern": "pincer", "min_wave": 6, "matrix": [["reflector", "jammer", "reflector"], ["hunter", "scout", "hunter"]]},
    {"name": "columns", "pattern": "columns", "min_wave": 7, "matrix": [["tank", "sniper", "tank"], ["tank", "sniper", "tank"]]},
    {"name": "ring", "pattern": "ring", "min_wave": 8, "matrix": [["phantom", "scout", "phantom"], ["sniper", "zigzag", "sniper"], ["phantom", "hunter", "phantom"]]},
    {"name": "fortress_line", "pattern": "line", "min_wave": 10, "matrix": [["warp_gate", "commander", "warp_gate"], ["tank", "sniper", "tank"]]},
    {"name": "assassins", "pattern": "vee", "min_wave": 12, "matrix": [["teleporter", "jammer", "teleporter"], ["hunter", "splitter", "hunter"]]},
    {"name": "mutation_lab", "pattern": "chaos", "min_wave": 15, "matrix": [["leech", "reflector", "leech"], ["bomber", "warp_gate", "bomber"], ["phantom", "commander", "phantom"]]},
]

BOSS_ROSTER = ["carrier", "warden", "hunter", "fortress", "hive", "leviathan", "vortex", "moth", "sentinel", "worldeater", "void_emperor", "omega_carrier"]

BOSS_SPECS = {
    "carrier": {"hp": 70, "reward": 35, "size": (140, 84), "color": NEON_PINK, "accent": NEON_YELLOW, "style": "carrier", "parts": {"left_bay": (24, "left"), "right_bay": (24, "right"), "engine": (18, "bottom"), "core": (28, "center")}},
    "warden": {"hp": 85, "reward": 40, "size": (144, 86), "color": NEON_PURPLE, "accent": NEON_CYAN, "style": "warden", "parts": {"shield_left": (20, "left"), "shield_right": (20, "right"), "eye": (18, "top"), "core": (30, "center")}},
    "hunter": {"hp": 62, "reward": 34, "size": (132, 76), "color": NEON_RED, "accent": NEON_ORANGE, "style": "hunter", "parts": {"claw_left": (18, "left"), "claw_right": (18, "right"), "core": (26, "center")}},
    "fortress": {"hp": 105, "reward": 48, "size": (160, 96), "color": NEON_ORANGE, "accent": NEON_YELLOW, "style": "fortress", "parts": {"turret_left": (18, "left"), "turret_right": (18, "right"), "generator": (22, "top"), "core": (36, "center")}},
    "hive": {"hp": 78, "reward": 38, "size": (136, 82), "color": NEON_LIME, "accent": NEON_GREEN, "style": "hive", "parts": {"node_left": (18, "left"), "node_right": (18, "right"), "core": (28, "center")}},
    "leviathan": {"hp": 130, "reward": 60, "size": (178, 100), "color": NEON_CYAN, "accent": NEON_BLUE, "style": "leviathan", "parts": {"cannon_left": (18, "left"), "cannon_right": (18, "right"), "reactor": (24, "bottom"), "core": (40, "center")}},
    "vortex": {"hp": 92, "reward": 44, "size": (146, 84), "color": NEON_PURPLE, "accent": NEON_PINK, "style": "vortex", "parts": {"sat_a": (16, "left"), "sat_b": (16, "right"), "sat_c": (16, "top"), "core": (30, "center")}},
    "moth": {"hp": 76, "reward": 36, "size": (132, 80), "color": NEON_YELLOW, "accent": NEON_ORANGE, "style": "moth", "parts": {"wing_left": (18, "left"), "wing_right": (18, "right"), "core": (28, "center")}},
    "sentinel": {"hp": 120, "reward": 52, "size": (156, 92), "color": (130, 220, 255), "accent": WHITE, "style": "sentinel", "parts": {"armor_left": (20, "left"), "armor_right": (20, "right"), "eye": (18, "top"), "core": (36, "center")}},
    "worldeater": {"hp": 160, "reward": 80, "size": (190, 112), "color": (255, 120, 120), "accent": NEON_YELLOW, "style": "worldeater", "parts": {"jaw_left": (24, "left"), "jaw_right": (24, "right"), "throat": (24, "top"), "core": (50, "center")}},
    "void_emperor": {"hp": 145, "reward": 72, "size": (178, 102), "color": (170, 120, 255), "accent": NEON_PINK, "style": "void_emperor", "parts": {"orb_left": (20, "left"), "orb_right": (20, "right"), "crown": (20, "top"), "core": (42, "center")}},
    "omega_carrier": {"hp": 170, "reward": 90, "size": (200, 116), "color": (120, 255, 230), "accent": NEON_BLUE, "style": "omega_carrier", "parts": {"bay_left": (22, "left"), "bay_right": (22, "right"), "bay_top": (22, "top"), "reactor": (26, "bottom"), "core": (56, "center")}},
}


def elite_modifier_stats(mods, hp, reward, width, height, speed):
    if "giant" in mods:
        width = int(width * 1.3)
        height = int(height * 1.3)
        hp = int(hp * 1.35)
    if "armored" in mods:
        hp = int(hp * 1.35)
    if "berserk" in mods:
        speed *= 1.25
        hp = int(hp * 0.95)
    if "regenerating" in mods:
        reward = int(reward * 1.2)
    if "resistant" in mods:
        hp = int(hp * 1.15)
    return hp, reward, width, height, speed


class FormationGroup:
    def __init__(self, template, wave, layer_speed=1.0):
        self.template = template
        self.wave = wave
        self.pattern = template["pattern"]
        self.matrix = template["matrix"]
        self.rows = len(self.matrix)
        self.cols = max(len(r) for r in self.matrix)
        self.cell_w = 58
        self.cell_h = 46
        self.gap_x = 16
        self.gap_y = 14
        self.width = self.cols * self.cell_w + (self.cols - 1) * self.gap_x
        self.height = self.rows * self.cell_h + (self.rows - 1) * self.gap_y
        self.x = max(22, (W - self.width) // 2)
        self.y = 62 + random.randint(-10, 12)
        self.base_y = self.y
        self.dir = random.choice([-1, 1])
        self.speed = (50 + wave * 3.2) * layer_speed
        self.phase = randf(0, math.tau)
        self.alive = True
        self.members = []

    def slot_pos(self, r, c):
        x = self.x + c * (self.cell_w + self.gap_x)
        y = self.y + r * (self.cell_h + self.gap_y)
        if self.pattern == "arc":
            y += int(abs(c - self.cols / 2) * 4)
        elif self.pattern == "vee":
            y += int(abs(c - self.cols / 2) * 7)
        elif self.pattern == "ring":
            x += int(math.cos((c / max(1, self.cols)) * math.tau) * 14)
            y += int(math.sin((r / max(1, self.rows)) * math.tau) * 10)
        elif self.pattern == "chaos":
            x += int(math.sin((r + c + self.phase) * 2) * 10)
            y += int(math.cos((r + c + self.phase) * 2) * 8)
        return x, y

    def update(self, dt):
        self.phase += dt * 1.2
        self.x += self.dir * self.speed * dt * 60
        if self.x < 18 or self.x + self.width > W - 18:
            self.dir *= -1
            self.y += 18
        self.y = self.base_y + math.sin(self.phase) * (6 + self.wave * 0.2)
        for e in self.members:
            if not e.alive:
                continue
            if e.state == "formation":
                e.x, e.y = self.slot_pos(e.slot_r, e.slot_c)
                e.base_x, e.base_y = e.x, e.y


class Enemy:
    def __init__(self, kind, x, y, wave=1, group=None, slot_r=0, slot_c=0, mods=None):
        self.kind = kind
        self.spec = ENEMY_TYPES[kind]
        self.group = group
        self.slot_r = slot_r
        self.slot_c = slot_c
        self.base_x = float(x)
        self.base_y = float(y)
        self.x = float(x)
        self.y = float(y)
        self.w, self.h = self.spec.size
        self.hp = self.spec.hp + wave // 3
        self.max_hp = self.hp
        self.reward = self.spec.reward + wave // 4
        self.speed = self.spec.speed + wave * 0.04
        self.state = "formation"
        self.phase = randf(0, math.tau)
        self.dive_timer = randf(1.2, 4.0)
        self.shoot_timer = randf(0.6, 3.0)
        self.return_timer = 0
        self.vx = 0
        self.vy = 0
        self.visible = True
        self.reflect_ready = True
        self.split_ready = self.spec.can_split
        self.jam_timer = 0
        self.mods = mods[:] if mods else []
        self.buff_speed = 1.0
        self.buff_fire = 1.0
        self.buff_reward = 1.0
        self.regen_timer = randf(1.5, 4.0)
        self.tele_timer = randf(1.5, 4.0)
        self.alive = True
        self.enemy_type_draw = self.kind
        self.hp, self.reward, self.w, self.h, self.speed = elite_modifier_stats(self.mods, self.hp, self.reward, self.w, self.h, self.speed)
        self.max_hp = self.hp
        self.shield = 1 if self.spec.can_shield else 0

    def rect(self):
        return pygame.Rect(int(self.x), int(self.y), self.w, self.h)

    def update(self, dt, player_rect, wave, events, hazards):
        if not self.alive:
            return []
        spawned = []
        self.buff_speed = max(0.75, self.buff_speed)
        self.buff_fire = max(0.75, self.buff_fire)
        if self.kind == "phantom":
            self.visible = (int(self.phase * 4) % 4) < 2 or self.hp <= self.max_hp * 0.3
        else:
            self.visible = True

        if "teleporting" in self.mods or self.spec.can_teleport:
            self.tele_timer -= dt
            if self.tele_timer <= 0:
                self.x = randf(40, W - 80)
                self.y = randf(40, H * 0.4)
                self.base_x, self.base_y = self.x, self.y
                self.tele_timer = randf(2.2, 4.5)
                spawn_particles(self.x + self.w / 2, self.y + self.h / 2, NEON_PINK, 8, 200, 0.35, 2)

        if self.spec.can_heal and self.group:
            for e in enemies:
                if e is self or not e.alive or e.kind == "boss":
                    continue
                d = math.hypot(e.x - self.x, e.y - self.y)
                if d < 110:
                    e.hp = min(e.max_hp, e.hp + (1 if wave > 8 and random.random() < 0.03 else 0))

        if self.kind == "leech":
            target = None
            best = 9999
            for e in enemies:
                if e is self or not e.alive or e.kind == "boss":
                    continue
                d = math.hypot(e.x - self.x, e.y - self.y)
                if d < best and d < 120:
                    best = d
                    target = e
            if target and random.random() < dt * 1.8:
                take = 1
                if target.hp > take:
                    target.hp -= take
                    self.hp = min(self.max_hp + 2, self.hp + take)

        if self.kind == "commander":
            for e in enemies:
                if e is self or not e.alive or e.kind == "boss":
                    continue
                d = math.hypot(e.x - self.x, e.y - self.y)
                if d < 150:
                    e.buff_speed = 1.25
                    e.buff_fire = 0.8

        if self.kind == "warp_gate":
            self.shoot_timer -= dt
            if self.shoot_timer <= 0 and len([e for e in enemies if e.alive and e.kind != "boss"]) < 26:
                pick = weighted_choice([("scout", 25), ("zigzag", 18), ("sniper", 14), ("splitter", 12), ("hunter", 10), ("jammer", 8), ("reflector", 7), ("teleporter", 6)])
                for _ in range(1 + (1 if wave > 12 and random.random() < 0.4 else 0)):
                    nx = clamp(self.x + randf(-40, 40), 24, W - 70)
                    ny = clamp(self.y + randf(18, 60), 20, H * 0.45)
                    spawned.append(Enemy(pick, nx, ny, wave=wave, group=self.group))
                self.shoot_timer = randf(1.8, 3.2)

        if self.state == "formation" and self.group:
            self.x, self.y = self.group.slot_pos(self.slot_r, self.slot_c)
            self.base_x, self.base_y = self.x, self.y
            if self.kind == "zigzag":
                self.x += math.sin(self.phase * 2.3) * 16
            elif self.kind == "sniper":
                self.x += math.cos(self.phase * 1.5) * 8
            elif self.kind == "healer":
                self.x += math.sin(self.phase * 1.3) * 10
            elif self.kind == "reflector":
                self.x += math.cos(self.phase * 1.4) * 8
            elif self.kind == "phantom" and not self.visible:
                self.x += math.sin(self.phase * 3.2) * 4

        self.phase += dt * 1.2
        self.dive_timer -= dt
        self.shoot_timer -= dt * self.buff_fire
        self.regen_timer -= dt

        if "berserk" in self.mods:
            self.speed *= 1.0005

        if "regenerating" in self.mods and self.regen_timer <= 0:
            self.hp = min(self.max_hp, self.hp + 1)
            self.regen_timer = randf(1.5, 3.5)

        if self.spec.can_bomb and self.state == "formation" and self.shoot_timer <= 0:
            if random.random() < 0.8:
                spawned.append(self.fire_bomb())
            self.shoot_timer = randf(1.6, 3.5)

        if self.kind == "mine":
            self.y += (0.35 + wave * 0.01) * dt * 60
            if self.y > H * 0.85 and math.hypot(player_rect.centerx - self.x, player_rect.centery - self.y) < 120:
                self.alive = False
                spawned.append(None)

        if self.state == "formation" and self.dive_timer <= 0 and random.random() < self.spec.dive:
            self.start_dive(player_rect, wave)
            self.dive_timer = randf(2.0, 5.3)

        if self.state == "dive":
            self.x += self.vx * dt * 60
            self.y += self.vy * dt * 60
            if self.kind == "hunter":
                self.x += math.sin(self.phase * 4) * 1.0
            if self.kind == "splitter" and self.split_ready and random.random() < 0.02:
                spawned.extend(self.split_wave(wave))
                self.alive = False
                return [s for s in spawned if s is not None]
            if self.kind == "bomber" and random.random() < 0.03:
                spawned.append(self.fire_bomb())
            self.return_timer -= dt
            if self.y > H * 0.78 or self.return_timer <= 0:
                self.state = "returning"
                if self.group:
                    self.base_x, self.base_y = self.group.slot_pos(self.slot_r, self.slot_c)
                self.base_x = clamp(self.base_x, 20, W - 20)
                self.base_y = clamp(self.base_y - 40, 18, H * 0.45)

        elif self.state == "returning":
            dx = self.base_x - self.x
            dy = self.base_y - self.y
            d = max(1.0, math.hypot(dx, dy))
            sp = (3.0 + wave * 0.02) * self.buff_speed
            self.x += dx / d * sp * 60 * dt
            self.y += dy / d * sp * 60 * dt
            if d < 10:
                self.state = "formation"
                self.dive_timer = randf(1.2, 4.2)
                self.shoot_timer = randf(0.6, 2.8)

        if self.shoot_timer <= 0 and self.spec.shoot > 0 and self.visible:
            spawned.append(self.fire_at_player())
            self.shoot_timer = randf(1.0, 3.8)

        if self.kind == "reflector":
            self.reflect_ready = True

        if self.kind == "jammer" and random.random() < dt * 0.01:
            self.phase += 0.5

        if self.x < -100 or self.x > W + 100 or self.y > H + 120:
            self.alive = False

        return [s for s in spawned if s is not None]

    def start_dive(self, player_rect, wave):
        dx = player_rect.centerx - self.x
        dy = player_rect.centery - self.y
        d = max(1.0, math.hypot(dx, dy))
        base = 4.2 + wave * 0.05
        pattern = random.choice(["plunge", "swoop", "hook"])
        self.return_timer = randf(1.0, 1.7)
        if pattern == "plunge":
            self.vx = dx / d * base * 0.8
            self.vy = base * 1.3
        elif pattern == "swoop":
            self.vx = random.choice([-1, 1]) * base * 1.4
            self.vy = base * 0.8
        else:
            self.vx = dx / d * base * 0.6
            self.vy = base * 1.0
        self.state = "dive"

    def fire_at_player(self):
        dx = player.x + player.w / 2 - self.x
        dy = player.y + player.h / 2 - self.y
        d = max(1.0, math.hypot(dx, dy))
        sp = 4.0 + randf(0, 2)
        return EnemyBullet(self.x + self.w / 2, self.y + self.h / 2, dx / d * sp, dy / d * sp, color=self.spec.color)

    def fire_bomb(self):
        return Meteor(self.x + self.w / 2, self.y + self.h, randf(-0.8, 0.8), 3.8, radius=7, damage=1)

    def split_wave(self, wave):
        mods = []
        kids = []
        for ox in (-14, 14):
            kids.append(Enemy("scout", self.x + ox, self.y + 8, wave=wave, group=self.group, mods=mods))
        return kids

    def target_part(self, boss):
        dx = self.x + self.w / 2 - (boss.x + boss.w / 2)
        dy = self.y + self.h / 2 - (boss.y + boss.h / 2)
        parts = boss.parts_alive()
        if dx < -boss.w * 0.18:
            for p in ["left_bay", "shield_left", "claw_left", "turret_left", "node_left", "cannon_left", "sat_a", "wing_left", "armor_left", "jaw_left", "orb_left", "bay_left"]:
                if p in parts:
                    return p
        if dx > boss.w * 0.18:
            for p in ["right_bay", "shield_right", "claw_right", "turret_right", "node_right", "cannon_right", "sat_b", "wing_right", "armor_right", "jaw_right", "orb_right", "bay_right"]:
                if p in parts:
                    return p
        if dy < -boss.h * 0.08:
            for p in ["eye", "generator", "crown", "throat", "sat_c", "bay_top"]:
                if p in parts:
                    return p
        for p in ["engine", "reactor", "core"]:
            if p in parts:
                return p
        return None

    def take_damage(self, dmg):
        if self.spec.can_shield and self.shield > 0:
            self.shield -= dmg
            return False
        if self.kind == "reflector" and self.reflect_ready:
            self.shield = max(0, self.shield - 1)
        self.hp -= dmg
        return self.hp <= 0

    def draw(self):
        if not self.alive:
            return
        if self.kind == "phantom" and not self.visible:
            pygame.draw.rect(screen, self.spec.outline, (int(self.x), int(self.y), self.w, self.h), 1)
            return
        x, y = int(self.x), int(self.y)
        w, h = self.w, self.h
        color = self.spec.color
        outline = self.spec.outline
        if self.kind in ["scout", "zigzag", "sniper", "mine", "teleporter"]:
            pts = [(x + w // 2, y), (x + w, y + h // 2), (x + w // 2, y + h), (x, y + h // 2)]
            pygame.draw.polygon(screen, color, pts, 2)
            pygame.draw.circle(screen, outline, (x + w // 2, y + h // 2), 4)
        elif self.kind == "tank":
            pygame.draw.rect(screen, color, (x, y, w, h), 2)
            pygame.draw.rect(screen, outline, (x + 8, y + 6, w - 16, h - 12), 1)
            pygame.draw.rect(screen, color, (x + w // 2 - 3, y - 6, 6, 12))
        elif self.kind in ["splitter", "jammer", "reflector", "healer", "hunter", "bomber", "leech", "commander", "warp_gate"]:
            pygame.draw.polygon(screen, color, [(x + w // 2, y), (x + w, y + h // 2), (x + w // 2, y + h), (x, y + h // 2)], 2)
            pygame.draw.circle(screen, outline, (x + w // 2, y + h // 2), 5)
            if self.kind == "warp_gate":
                pygame.draw.circle(screen, NEON_CYAN, (x + w // 2, y + h // 2), 12, 2)
        else:
            pygame.draw.polygon(screen, color, [(x + w // 2, y), (x + w, y + h // 2), (x + w // 2, y + h), (x, y + h // 2)], 2)
        bw = int(w * (self.hp / max(1, self.max_hp)))
        pygame.draw.rect(screen, (255, 255, 255), (x, y - 8, w, 4), 1)
        pygame.draw.rect(screen, NEON_GREEN, (x, y - 8, bw, 4))
        if self.spec.can_shield:
            sw = int(w * (self.shield / max(1, self.spec.hp)))
            pygame.draw.rect(screen, NEON_CYAN, (x, y - 14, sw, 3))


class Boss:
    def __init__(self, kind, wave):
        self.kind = kind
        self.spec = BOSS_SPECS[kind]
        self.w, self.h = self.spec["size"]
        self.x = W / 2 - self.w / 2
        self.y = 54
        self.hp = self.spec["hp"] + wave * 5
        self.max_hp = self.hp
        self.reward = self.spec["reward"] + wave * 2
        self.parts = {}
        for name, (php, role) in self.spec["parts"].items():
            self.parts[name] = {"hp": php + wave // 8, "max": php + wave // 8, "role": role}
        self.alive = True
        self.flash = 0
        self.t = 0
        self.cooldown = 0
        self.summon_timer = 0
        self.phase = 0
        self.dir = random.choice([-1, 1])
        self.tele_timer = randf(1.8, 3.5)
        self.locked = False

    def parts_alive(self):
        return {n: p for n, p in self.parts.items() if p["hp"] > 0}

    def active_part_names(self):
        return [n for n, p in self.parts.items() if p["hp"] > 0]

    def target_part(self, bullet):
        alive = self.parts_alive()
        if not alive:
            return None
        bx = bullet.x
        by = bullet.y
        cx = self.x + self.w / 2
        cy = self.y + self.h / 2
        if bx < cx - self.w * 0.2:
            for p in ["left_bay", "shield_left", "claw_left", "turret_left", "node_left", "cannon_left", "sat_a", "wing_left", "armor_left", "jaw_left", "orb_left", "bay_left"]:
                if p in alive:
                    return p
        if bx > cx + self.w * 0.2:
            for p in ["right_bay", "shield_right", "claw_right", "turret_right", "node_right", "cannon_right", "sat_b", "wing_right", "armor_right", "jaw_right", "orb_right", "bay_right"]:
                if p in alive:
                    return p
        if by < cy - self.h * 0.1:
            for p in ["eye", "generator", "crown", "throat", "sat_c", "bay_top"]:
                if p in alive:
                    return p
        for p in ["engine", "reactor", "core"]:
            if p in alive:
                return p
        return next(iter(alive.keys()))

    def damage_part(self, name, amount):
        part = self.parts.get(name)
        if not part:
            return False
        part["hp"] -= amount
        if part["hp"] <= 0:
            spawn_particles(self.x + self.w / 2, self.y + self.h / 2, NEON_YELLOW, 14, 200, 0.35, 2)
            if name in ["engine", "reactor"]:
                self.locked = True
            return True
        return False

    def take_hit(self, bullet):
        part = self.target_part(bullet)
        if part:
            if self.damage_part(part, bullet.damage):
                if part == "core":
                    self.hp = 0
            else:
                if part == "core":
                    self.hp -= bullet.damage
        else:
            self.hp -= bullet.damage
        self.flash = 8
        return self.hp <= 0

    def update(self, dt, wave):
        self.t += dt
        self.cooldown -= dt
        self.summon_timer -= dt
        self.tele_timer -= dt
        if self.flash > 0:
            self.flash -= 1
        alive = self.active_part_names()
        shield_left = any(n in alive for n in ["shield_left", "shield_right", "armor_left", "armor_right"])
        core_alive = "core" in alive
        if self.kind == "carrier":
            self.x = W / 2 + math.sin(self.t * 1.1) * 180
            self.y = 64 + math.sin(self.t * 1.8) * 12
            if self.cooldown <= 0:
                spread = 3 if core_alive else 5
                for s in range(-spread, spread + 1, 2):
                    enemy_bullets.append(EnemyBullet(self.x + self.w / 2, self.y + self.h, s * 0.35, 4.4, NEON_PINK))
                self.cooldown = 0.9 if core_alive else 0.55
            if self.summon_timer <= 0 and any(n in alive for n in ["left_bay", "right_bay"]):
                for _ in range(2 if core_alive else 4):
                    enemies.append(Enemy(random.choice(["scout", "zigzag", "sniper"]), randf(50, W - 100), randf(40, 120), wave=wave))
                self.summon_timer = 3.2 if core_alive else 2.0
        elif self.kind == "warden":
            self.x = W / 2 + math.cos(self.t * 0.9) * 160
            self.y = 64 + math.sin(self.t * 1.4) * 10
            if self.cooldown <= 0:
                count = 10 if shield_left else 16
                for i in range(count):
                    ang = self.t + i * math.tau / count
                    enemy_bullets.append(EnemyBullet(self.x + self.w / 2, self.y + self.h / 2, math.cos(ang) * 3.8, math.sin(ang) * 3.8, NEON_CYAN))
                self.cooldown = 2.0 if shield_left else 1.2
        elif self.kind == "hunter":
            if self.cooldown <= 0:
                self.dir *= -1
                self.cooldown = 1.7 if core_alive else 1.0
            self.x += self.dir * (6 if core_alive else 8)
            self.y = 68 + math.sin(self.t * 2.1) * 16
            self.x = clamp(self.x, 20, W - self.w - 20)
            if random.random() < 0.1:
                enemy_bullets.append(EnemyBullet(self.x + self.w / 2, self.y + self.h, random.uniform(-1.5, 1.5), 4.4, NEON_RED))
        elif self.kind == "fortress":
            self.x = W / 2 + math.sin(self.t * 0.55) * 90
            self.y = 58 + math.sin(self.t * 0.85) * 8
            if self.cooldown <= 0:
                fan = 7 if core_alive else 11
                for s in range(-fan // 2, fan // 2 + 1):
                    enemy_bullets.append(EnemyBullet(self.x + self.w / 2, self.y + self.h, s * 0.8, 4.2, NEON_ORANGE))
                self.cooldown = 1.1 if core_alive else 0.7
            if self.summon_timer <= 0 and any(n in alive for n in ["turret_left", "turret_right"]):
                enemies.append(Enemy("tank", randf(60, W - 100), 40, wave=wave))
                self.summon_timer = 3.6
        elif self.kind == "hive":
            self.x = W / 2 + math.sin(self.t * 1.3) * 150
            self.y = 62 + math.cos(self.t * 1.2) * 10
            if self.cooldown <= 0:
                count = 4 if core_alive else 6
                for _ in range(count):
                    enemy_bullets.append(EnemyBullet(self.x + self.w / 2, self.y + self.h, random.uniform(-2.4, 2.4), random.uniform(3.0, 4.8), NEON_GREEN))
                self.cooldown = 0.85 if core_alive else 0.55
            if self.summon_timer <= 0 and any(n in alive for n in ["node_left", "node_right"]):
                for _ in range(3 if core_alive else 5):
                    enemies.append(Enemy(random.choice(["scout", "splitter", "hunter"]), randf(50, W - 100), 30, wave=wave))
                self.summon_timer = 2.5 if core_alive else 1.6
        elif self.kind == "leviathan":
            self.x = W / 2 + math.sin(self.t * 0.75) * 210
            self.y = 54 + math.cos(self.t * 0.8) * 10
            if self.cooldown <= 0:
                for s in (-1.8, -0.9, 0, 0.9, 1.8):
                    enemy_bullets.append(EnemyBullet(self.x + self.w / 2, self.y + self.h, s, 4.8, NEON_CYAN))
                self.cooldown = 1.3 if core_alive else 0.85
        elif self.kind == "vortex":
            self.x = W / 2 + math.sin(self.t * 1.0) * 140
            self.y = 66 + math.sin(self.t * 1.6) * 10
            if self.cooldown <= 0:
                n = 8 if core_alive else 12
                for i in range(n):
                    a = self.t * 2.0 + i * (math.tau / n)
                    enemy_bullets.append(EnemyBullet(self.x + self.w / 2, self.y + self.h / 2, math.cos(a) * 4.0, math.sin(a) * 4.0, NEON_PURPLE))
                self.cooldown = 1.9 if core_alive else 1.2
        elif self.kind == "moth":
            self.x = W / 2 + math.cos(self.t * 1.2) * 130
            self.y = 62 + math.sin(self.t * 1.4) * 12
            if self.cooldown <= 0:
                for i in range(5):
                    enemy_bullets.append(EnemyBullet(self.x + self.w / 2, self.y + self.h, (i - 2) * 0.7, 4.1, NEON_YELLOW))
                self.cooldown = 1.0
            if self.summon_timer <= 0 and any(n in alive for n in ["wing_left", "wing_right"]):
                for _ in range(2):
                    enemies.append(Enemy("mine", randf(50, W - 100), 20, wave=wave))
                self.summon_timer = 2.8
        elif self.kind == "sentinel":
            self.x = W / 2 + math.sin(self.t * 0.95) * 160
            self.y = 56 + math.sin(self.t * 1.3) * 8
            if self.cooldown <= 0:
                for s in (-2, -1, 0, 1, 2):
                    enemy_bullets.append(EnemyBullet(self.x + self.w / 2, self.y + self.h, s * 0.5, 5.0, WHITE))
                self.cooldown = 1.5 if core_alive else 0.95
        elif self.kind == "worldeater":
            self.x = W / 2 + math.sin(self.t * 0.45) * 80
            self.y = 60 + math.cos(self.t * 0.6) * 8
            if self.cooldown <= 0:
                for s in range(-3, 4):
                    enemy_bullets.append(EnemyBullet(self.x + self.w / 2, self.y + self.h, s * 0.6, 4.5, NEON_RED))
                self.cooldown = 1.0 if core_alive else 0.65
        elif self.kind == "void_emperor":
            self.x = W / 2 + math.sin(self.t * 1.1) * 120
            self.y = 60 + math.cos(self.t * 1.1) * 12
            if self.tele_timer <= 0 and core_alive:
                self.x = randf(40, W - self.w - 40)
                self.tele_timer = randf(1.8, 3.5)
                spawn_particles(self.x + self.w / 2, self.y + self.h / 2, NEON_PURPLE, 12, 220, 0.35, 2)
            if self.cooldown <= 0:
                for s in (-2.5, -1.5, -0.5, 0.5, 1.5, 2.5):
                    enemy_bullets.append(EnemyBullet(self.x + self.w / 2, self.y + self.h, s * 0.8, 4.4, NEON_PINK))
                self.cooldown = 1.2 if core_alive else 0.8
        elif self.kind == "omega_carrier":
            self.x = W / 2 + math.sin(self.t * 0.85) * 180
            self.y = 56 + math.cos(self.t * 0.8) * 10
            if self.cooldown <= 0:
                for s in (-2, -1, 0, 1, 2):
                    enemy_bullets.append(EnemyBullet(self.x + self.w / 2, self.y + self.h, s * 0.9, 4.8, NEON_CYAN))
                self.cooldown = 1.1 if core_alive else 0.75
            if self.summon_timer <= 0 and any(n in alive for n in ["bay_left", "bay_right", "bay_top"]):
                for _ in range(4 if core_alive else 6):
                    enemies.append(Enemy(random.choice(["scout", "splitter", "hunter", "jammer"]), randf(40, W - 100), 20, wave=wave))
                self.summon_timer = 2.4 if core_alive else 1.6

        if self.kind == "worldeater" and self.cooldown <= 0 and core_alive:
            self.cooldown = 0.6

        if self.hp <= 0:
            self.alive = False

    def draw(self):
        if not self.alive:
            return
        x, y = int(self.x), int(self.y)
        w, h = self.w, self.h
        color = self.spec["color"] if self.flash <= 0 else WHITE
        accent = self.spec["accent"]
        style = self.spec["style"]
        if style == "carrier":
            pygame.draw.ellipse(screen, color, (x, y, w, h), 2)
            pygame.draw.ellipse(screen, accent, (x + 24, y + 12, w - 48, h - 24), 2)
            pygame.draw.rect(screen, color, (x + w // 2 - 5, y + h // 2 - 20, 10, 40))
        elif style == "warden":
            pygame.draw.polygon(screen, color, [(x + w // 2, y), (x + w, y + h // 2), (x + w // 2, y + h), (x, y + h // 2)], 2)
            pygame.draw.circle(screen, accent, (x + w // 2, y + h // 2), 18, 2)
        elif style == "hunter":
            pygame.draw.polygon(screen, color, [(x + w // 2, y), (x + w, y + h - 6), (x + w // 2, y + h), (x, y + h - 6)], 2)
        elif style == "fortress":
            pygame.draw.rect(screen, color, (x, y, w, h), 3)
            pygame.draw.rect(screen, accent, (x + 16, y + 16, w - 32, h - 32), 2)
            pygame.draw.line(screen, color, (x + 20, y + h // 2), (x + w - 20, y + h // 2), 3)
        elif style == "hive":
            pygame.draw.circle(screen, color, (x + w // 2, y + h // 2), h // 2, 2)
            pygame.draw.circle(screen, accent, (x + w // 2, y + h // 2), 18, 2)
            for ang in range(0, 360, 60):
                ax = x + w // 2 + int(math.cos(math.radians(ang)) * 30)
                ay = y + h // 2 + int(math.sin(math.radians(ang)) * 18)
                pygame.draw.circle(screen, accent, (ax, ay), 4)
        elif style == "leviathan":
            pygame.draw.ellipse(screen, color, (x, y + 8, w, h - 16), 2)
            pygame.draw.line(screen, accent, (x + 24, y + h // 2), (x + w - 24, y + h // 2), 3)
        elif style == "vortex":
            pygame.draw.polygon(screen, color, [(x + w // 2, y), (x + w, y + h // 3), (x + 3 * w // 4, y + h), (x + w // 4, y + h), (x, y + h // 3)], 2)
            pygame.draw.circle(screen, accent, (x + w // 2, y + h // 2), 14, 2)
        elif style == "moth":
            pygame.draw.ellipse(screen, color, (x + 18, y, w - 36, h), 2)
            pygame.draw.line(screen, accent, (x + w // 2, y + 10), (x + w // 2, y + h - 10), 2)
        elif style == "sentinel":
            pygame.draw.rect(screen, color, (x + 8, y + 8, w - 16, h - 16), 2)
            pygame.draw.circle(screen, accent, (x + w // 2, y + h // 2), 18, 2)
        elif style == "worldeater":
            pygame.draw.ellipse(screen, color, (x, y + 6, w, h - 12), 2)
            pygame.draw.polygon(screen, accent, [(x + 40, y + h // 2), (x + w // 2, y + 8), (x + w - 40, y + h // 2), (x + w // 2, y + h - 8)], 2)
        elif style == "void_emperor":
            pygame.draw.polygon(screen, color, [(x + w // 2, y), (x + w, y + h // 3), (x + 3 * w // 4, y + h), (x + w // 4, y + h), (x, y + h // 3)], 2)
            pygame.draw.circle(screen, accent, (x + w // 2, y + h // 2), 16, 2)
        elif style == "omega_carrier":
            pygame.draw.ellipse(screen, color, (x, y, w, h), 2)
            pygame.draw.rect(screen, accent, (x + 30, y + 16, w - 60, h - 32), 2)
            pygame.draw.rect(screen, color, (x + w // 2 - 4, y + h // 2 - 24, 8, 48))
        draw_boss_parts(self)

    def hitbox(self):
        return pygame.Rect(int(self.x), int(self.y), self.w, self.h)


class WaveEvent:
    def __init__(self, kind, duration):
        self.kind = kind
        self.duration = duration
        self.timer = 0
        self.cooldown = 0
        self.active = True

    def update(self, dt):
        self.timer += dt
        self.duration -= dt
        if self.kind == "meteor":
            self.cooldown -= dt
            if self.cooldown <= 0:
                meteors.append(Meteor(randf(0, W), -20, randf(-0.6, 0.6), randf(3.5, 5.5), radius=random.randint(7, 13), damage=1))
                self.cooldown = randf(0.45, 0.9)
        if self.duration <= 0:
            self.active = False


class WaveDirector:
    def __init__(self, wave):
        self.wave = wave
        self.time = 0
        self.plan = self.build_plan(wave)
        self.events = self.choose_events(wave)
        self.index = 0

    def choose_events(self, wave):
        candidates = []
        if wave >= 3:
            candidates.append("meteor")
        if wave >= 4:
            candidates.append("nebula")
        if wave >= 5:
            candidates.append("solar")
        if wave >= 6:
            candidates.append("ion")
        if wave >= 8:
            candidates.append("blackhole")
        chosen = []
        if candidates:
            chosen.append(WaveEvent(random.choice(candidates), randf(18, 28) + wave * 0.5))
            if wave >= 10 and random.random() < 0.5:
                chosen.append(WaveEvent(random.choice([c for c in candidates if c != chosen[0].kind]), randf(14, 20) + wave * 0.4))
        return chosen

    def pick_template(self, budget):
        eligible = [t for t in FORMATION_TEMPLATES if t["min_wave"] <= self.wave]
        scored = []
        for t in eligible:
            cost = template_cost(t)
            if cost <= budget:
                scored.append((t, max(1, 30 - abs(cost - budget))))
        if not scored:
            return random.choice(eligible) if eligible else FORMATION_TEMPLATES[0]
        return weighted_choice(scored)

    def build_plan(self, wave):
        budget = 30 + wave * 12
        layers = []
        count = clamp(2 + wave // 2, 2, 5)
        delay = max(0.9, 2.8 - wave * 0.04)
        for i in range(count):
            t = self.pick_template(budget)
            cost = template_cost(t)
            layers.append({"at": i * delay, "type": "group", "template": t})
            budget -= cost
            if budget <= 0:
                break
        if wave % 4 == 0:
            boss_kind = choose_boss(wave)
            layers.append({"at": count * delay + 1.0, "type": "boss", "boss": boss_kind})
        return layers

    def update(self, dt):
        self.time += dt
        while self.index < len(self.plan) and self.time >= self.plan[self.index]["at"]:
            item = self.plan[self.index]
            if item["type"] == "group":
                spawn_group(item["template"], self.wave)
            else:
                spawn_boss(item["boss"], self.wave)
            self.index += 1

    def done_spawning(self):
        return self.index >= len(self.plan)


def template_cost(template):
    return sum(ENEMY_COST.get(kind, 4) for row in template["matrix"] for kind in row if kind)


def choose_boss(wave):
    if wave % 20 == 0:
        return random.choice(["worldeater", "void_emperor", "omega_carrier"])
    if wave % 10 == 0:
        return random.choice(["leviathan", "vortex", "sentinel", "moth"])
    return random.choice(["carrier", "warden", "hunter", "fortress", "hive"])


starfield = Starfield()
player = Player()
player.sync_upgrades()
bullets = []
enemy_bullets = []
enemies = []
meteors = []
particles = []
director = None
boss = None
score = 0
wave = 1
run_kills = 0
run_coins = 0
message = ""
message_timer = 0
wave_flash = 0
wave_clear_delay = 0
current_fire_slow_mult = 1.0
active_events = []
current_state = STATE_MENU
shop_message = ""


def spawn_particles(x, y, color, amount=10, speed=220, life=0.8, size=2):
    for _ in range(amount):
        particles.append(Particle(x, y, color, randf(-speed, speed), randf(-speed, speed), randf(life * 0.5, life), size))


def set_message(text, duration=FPS * 2):
    global message, message_timer
    message = text
    message_timer = duration


def reset_wave_state():
    global bullets, enemy_bullets, enemies, meteors, particles, director, boss, active_events, current_fire_slow_mult, wave_clear_delay
    bullets = []
    enemy_bullets = []
    enemies = []
    meteors = []
    particles = []
    active_events = []
    director = WaveDirector(wave)
    boss = None
    current_fire_slow_mult = 1.0
    wave_clear_delay = 0


def reset_run():
    global wave, score, run_kills, run_coins, wave_flash, current_state
    player.__init__()
    player.sync_upgrades()
    wave = 1
    score = 0
    run_kills = 0
    run_coins = 0
    wave_flash = 0
    reset_wave_state()
    set_message("Wave 1. Layers inbound.")
    current_state = STATE_GAMEPLAY


def begin_wave(next_wave):
    global wave, director, active_events, wave_flash, wave_clear_delay
    wave = next_wave
    game_save["highest_wave"] = max(game_save["highest_wave"], wave)
    save_game()
    reset_wave_state()
    set_message(f"Wave {wave}. The swarm evolves.", FPS * 2)
    wave_flash = 1


def start_shop(text=""):
    global current_state, shop_message
    shop_message = text
    current_state = STATE_SHOP


def add_coins(amount):
    global run_coins
    game_save["coins"] += amount
    game_save["lifetime_coins"] += amount
    run_coins += amount
    save_game()


def add_kill():
    global score, run_kills
    score += 10
    run_kills += 1
    game_save["total_kills"] += 1
    save_game()


def buy_upgrade(key, base_cost, label):
    u = game_save["upgrades"]
    cost = int(base_cost * (1.45 ** u[key]))
    if game_save["coins"] < cost:
        set_message(f"Need {cost} coins for {label}.", FPS)
        return
    game_save["coins"] -= cost
    u[key] += 1
    save_game()
    player.sync_upgrades()
    set_message(f"{label} upgraded.", FPS)


def spawn_group(template, wave_num):
    group = FormationGroup(template, wave_num, layer_speed=1.0 + wave_num * 0.03)
    matrix = template["matrix"]
    kind_choices = ["scout", "zigzag", "tank", "sniper", "splitter", "shielded", "healer", "hunter", "mine", "jammer", "reflector", "bomber", "phantom", "leech", "commander", "warp_gate", "teleporter"]
    for r, row in enumerate(matrix):
        for c, kind in enumerate(row):
            if not kind:
                continue
            slot_x, slot_y = group.slot_pos(r, c)
            mods = []
            if wave_num >= 8 and random.random() < 0.1:
                mods.append(random.choice(["armored", "berserk", "regenerating", "resistant", "teleporting"]))
            if wave_num >= 14 and random.random() < 0.05:
                mods.append("giant")
            e = Enemy(kind, slot_x, slot_y, wave=wave_num, group=group, slot_r=r, slot_c=c, mods=mods)
            group.members.append(e)
            enemies.append(e)
    if wave_num >= 6 and random.random() < 0.35 and len(enemies) < 26:
        kind = weighted_choice([("commander", 20), ("leech", 14), ("warp_gate", 18), ("jammer", 12), ("reflector", 12), ("phantom", 10), ("bomber", 10), ("teleporter", 8)])
        x, y = group.slot_pos(0, 0)
        e = Enemy(kind, x + randf(-30, 30), y - 20, wave=wave_num, group=group, mods=[random.choice(["armored", "berserk"])])
        group.members.append(e)
        enemies.append(e)
    groups.append(group)


def choose_wave_events():
    active_events.clear()
    if wave >= 3 and random.random() < 0.7:
        active_events.append(WaveEvent("meteor", randf(18, 28) + wave * 0.4))
    if wave >= 4 and random.random() < 0.55:
        active_events.append(WaveEvent("nebula", randf(18, 26) + wave * 0.3))
    if wave >= 5 and random.random() < 0.55:
        active_events.append(WaveEvent("solar", randf(16, 24) + wave * 0.3))
    if wave >= 6 and random.random() < 0.6:
        active_events.append(WaveEvent("ion", randf(18, 26) + wave * 0.3))
    if wave >= 8 and random.random() < 0.5:
        active_events.append(WaveEvent("blackhole", randf(14, 22) + wave * 0.3))


def spawn_boss(kind, wave_num):
    global boss, enemies
    boss = Boss(kind, wave_num)
    enemies.append(boss)
    set_message(f"BOSS STAGE: {kind.upper()}", FPS * 2)


def update_events(dt):
    global current_fire_slow_mult
    current_fire_slow_mult = 1.0
    for e in active_events[:]:
        e.update(dt)
        if e.kind == "solar":
            current_fire_slow_mult = 1.2
        if e.kind == "ion":
            current_fire_slow_mult *= 1.0
        if not e.active:
            active_events.remove(e)


def apply_blackhole_pull():
    if not any(e.kind == "blackhole" for e in active_events):
        return
    cx, cy = W / 2, H / 2
    for obj in bullets + enemy_bullets + meteors:
        dx = cx - obj.x
        dy = cy - obj.y
        d = math.hypot(dx, dy)
        if d < 180:
            pull = 0.04 * (1 - d / 180)
            if hasattr(obj, "vx"):
                obj.vx += dx * pull * 0.05
                obj.vy += dy * pull * 0.05
    for e in enemies:
        if not e.alive:
            continue
        dx = cx - e.x
        dy = cy - e.y
        d = math.hypot(dx, dy)
        if d < 220 and e.kind != "boss":
            e.x += dx * 0.002
            e.y += dy * 0.002
    dx = cx - player.x
    dy = cy - player.y
    d = math.hypot(dx, dy)
    if d < 220:
        player.x += dx * 0.002
        player.y += dy * 0.001


def fire_at_player_from(x, y, speed=4.5, color=NEON_RED):
    dx = (player.x + player.w / 2) - x
    dy = (player.y + player.h / 2) - y
    d = max(1.0, math.hypot(dx, dy))
    enemy_bullets.append(EnemyBullet(x, y, dx / d * speed, dy / d * speed, color=color))


def draw_boss_parts(b):
    alive = b.parts_alive()
    cx = int(b.x + b.w / 2)
    cy = int(b.y + b.h / 2)
    positions = {
        "left_bay": (b.x + 18, cy), "shield_left": (b.x + 16, cy), "claw_left": (b.x + 16, cy), "turret_left": (b.x + 16, cy),
        "node_left": (b.x + 18, cy), "cannon_left": (b.x + 18, cy), "sat_a": (b.x + 18, cy), "wing_left": (b.x + 16, cy),
        "armor_left": (b.x + 16, cy), "jaw_left": (b.x + 16, cy), "orb_left": (b.x + 16, cy), "bay_left": (b.x + 16, cy),
        "right_bay": (b.x + b.w - 18, cy), "shield_right": (b.x + b.w - 16, cy), "claw_right": (b.x + b.w - 16, cy), "turret_right": (b.x + b.w - 16, cy),
        "node_right": (b.x + b.w - 18, cy), "cannon_right": (b.x + b.w - 18, cy), "sat_b": (b.x + b.w - 18, cy), "wing_right": (b.x + b.w - 16, cy),
        "armor_right": (b.x + b.w - 16, cy), "jaw_right": (b.x + b.w - 16, cy), "orb_right": (b.x + b.w - 16, cy), "bay_right": (b.x + b.w - 16, cy),
        "engine": (cx, b.y + b.h - 12), "reactor": (cx, b.y + b.h - 10), "generator": (cx, b.y + 12), "eye": (cx, b.y + 14),
        "core": (cx, cy), "throat": (cx, b.y + 14), "crown": (cx, b.y + 12), "bay_top": (cx, b.y + 12),
    }
    for name, part in b.parts.items():
        if part["hp"] <= 0:
            continue
        px, py = positions.get(name, (cx, cy))
        color = NEON_CYAN if part["role"] in ["left", "right", "top", "bottom"] else NEON_YELLOW
        pygame.draw.circle(screen, color, (int(px), int(py)), 7, 2)
        pygame.draw.circle(screen, WHITE, (int(px), int(py)), 2)
        bw = 18
        pygame.draw.rect(screen, (255, 255, 255), (px - bw // 2, py - 14, bw, 3), 1)
        pygame.draw.rect(screen, color, (px - bw // 2, py - 14, int(bw * part["hp"] / max(1, part["max"])), 3))


starfield = Starfield()
groups = []
current_fire_slow_mult = 1.0


def reset_game():
    global state, wave, score, run_kills, run_coins, director, boss, bullets, enemy_bullets, enemies, meteors, particles, active_events, wave_clear_delay, wave_flash
    player.__init__()
    player.sync_upgrades()
    bullets = []
    enemy_bullets = []
    enemies = []
    meteors = []
    particles = []
    groups.clear()
    active_events = []
    director = WaveDirector(1)
    boss = None
    wave = 1
    score = 0
    run_kills = 0
    run_coins = 0
    wave_clear_delay = 0
    wave_flash = 0
    state = STATE_GAMEPLAY
    choose_wave_events()
    set_message("Wave 1. Layers inbound.")


def next_wave():
    global wave, director, boss, wave_flash
    wave += 1
    game_save["highest_wave"] = max(game_save["highest_wave"], wave)
    save_game()
    director = WaveDirector(wave)
    boss = None
    bullets.clear()
    enemy_bullets.clear()
    meteors.clear()
    particles.clear()
    groups.clear()
    enemies[:] = []
    choose_wave_events()
    wave_flash = 1
    set_message(f"Wave {wave}. The swarm evolves.", FPS * 2)


def end_run():
    global state
    game_save["games_played"] += 1
    game_save["highest_wave"] = max(game_save["highest_wave"], wave)
    save_game()
    state = STATE_GAMEOVER


def draw_wave_banner():
    if wave_flash > 0:
        overlay = pygame.Surface((W, H), pygame.SRCALPHA)
        overlay.fill((255, 255, 255, int(25 * wave_flash)))
        screen.blit(overlay, (0, 0))


def spawn_meteors(dt):
    for e in active_events:
        if e.kind == "meteor":
            if random.random() < dt * 0.7:
                meteors.append(Meteor(randf(0, W), -20, randf(-0.8, 0.8), randf(3.5, 5.6), radius=random.randint(7, 13), damage=1))


def apply_ion_storm():
    if not any(e.kind == "ion" for e in active_events):
        return
    for b in enemy_bullets:
        dx = (player.x + player.w / 2) - b.x
        dy = (player.y + player.h / 2) - b.y
        d = max(1.0, math.hypot(dx, dy))
        b.vx += dx / d * 0.015
        b.vy += dy / d * 0.015


def draw_events_overlay():
    if any(e.kind == "nebula" for e in active_events):
        surf = pygame.Surface((W, H), pygame.SRCALPHA)
        surf.fill((10, 15, 35, 75))
        pygame.draw.circle(surf, (0, 0, 0, 0), (int(player.x + player.w / 2), int(player.y + player.h / 2)), 160)
        screen.blit(surf, (0, 0))
    if any(e.kind == "solar" for e in active_events):
        surf = pygame.Surface((W, H), pygame.SRCALPHA)
        surf.fill((255, 210, 120, 20))
        screen.blit(surf, (0, 0))


reset_game()

running = True
last_time = 0
while running:
    dt = clock.tick(FPS) / 1000.0
    screen.fill(BLACK)
    starfield.draw(dt)

    for ev in pygame.event.get():
        if ev.type == pygame.QUIT:
            running = False
        elif ev.type == pygame.KEYDOWN:
            if state == STATE_MENU:
                if ev.key == pygame.K_SPACE:
                    reset_game()
                elif ev.key == pygame.K_q:
                    running = False
            elif state == STATE_GAMEOVER:
                if ev.key == pygame.K_SPACE:
                    state = STATE_MENU
                elif ev.key == pygame.K_s:
                    state = STATE_SHOP
            elif state == STATE_SHOP:
                if ev.key == pygame.K_SPACE:
                    state = STATE_GAMEPLAY
                elif ev.key == pygame.K_1:
                    buy_upgrade("damage", 25, "Damage")
                elif ev.key == pygame.K_2:
                    buy_upgrade("fire_rate", 35, "Fire Rate")
                elif ev.key == pygame.K_3:
                    buy_upgrade("speed", 30, "Speed")
                elif ev.key == pygame.K_4:
                    buy_upgrade("shield", 40, "Shield")
                elif ev.key == pygame.K_5:
                    buy_upgrade("multishot", 45, "Multi-shot")
                elif ev.key == pygame.K_6:
                    buy_upgrade("pierce", 60, "Pierce")
        elif ev.type == pygame.MOUSEBUTTONDOWN and state == STATE_GAMEPLAY:
            if ev.button == 1 and player.jam_timer <= 0:
                player.shoot()

    if state == STATE_MENU:
        draw_text("STARFIGHTER", font_title, NEON_BLUE, W // 2, H // 2 - 120)
        draw_text("NEON OVERDRIVE", font_title, NEON_YELLOW, W // 2, H // 2 - 60)
        draw_text("Threat-budget waves, bosses, hazards, elites.", font_sub, WHITE, W // 2, H // 2 + 10)
        draw_text("[ SPACE ] Start", font_sub, NEON_GREEN, W // 2, H // 2 + 80)
        draw_text("[ Q ] Quit", font_sub, WHITE, W // 2, H // 2 + 120)
        draw_text(f"Saved coins: {game_save['coins']}", font_score, NEON_YELLOW, W // 2, H // 2 + 180)

    elif state == STATE_GAMEPLAY:
        if message_timer > 0:
            message_timer -= 1
        if wave_flash > 0:
            wave_flash -= dt * 2.2

        player.update()
        current_fire_slow_mult = 1.2 if any(e.kind == "solar" for e in active_events) else 1.0
        if director:
            director.update(dt)
            if director.done_spawning() and not enemies:
                if wave_clear_delay <= 0:
                    wave_clear_delay = 1.5
                    set_message(f"Wave {wave} cleared.", FPS)
                else:
                    wave_clear_delay -= dt
                    if wave_clear_delay <= 0:
                        next_wave()
                        choose_wave_events()
                        director = WaveDirector(wave)

        update_events(dt)
        spawn_meteors(dt)
        apply_blackhole_pull()
        apply_ion_storm()

        for g in groups:
            g.update(dt)

        for b in bullets[:]:
            b.update(dt)
            if b.y < -20 or b.x < -20 or b.x > W + 20:
                bullets.remove(b)
                continue
            for e in enemies[:]:
                if not e.alive:
                    continue
                if e.kind == "boss":
                    rect = e.hitbox()
                    if not e.visible if hasattr(e, "visible") else False:
                        continue
                    if rect.collidepoint(int(b.x), int(b.y)):
                        killed = e.take_hit(b)
                        if b.pierce > 0:
                            b.pierce -= 1
                        else:
                            if b in bullets:
                                bullets.remove(b)
                        if killed:
                            e.alive = False
                            if e in enemies:
                                enemies.remove(e)
                            add_coins(e.reward)
                            add_kill()
                            spawn_particles(e.x + e.w / 2, e.y + e.h / 2, NEON_YELLOW, 70, 400, 1.0, 3)
                            boss = None
                            set_message(f"{e.kind.upper()} destroyed!", FPS * 2)
                        break
                else:
                    if e.rect().collidepoint(int(b.x), int(b.y)):
                        if e.kind == "reflector" and e.visible and b.y > e.y + e.h * 0.55 and e.reflect_ready:
                            b.vy = abs(b.vy)
                            b.y = e.y + e.h + 3
                            e.reflect_ready = False
                            spawn_particles(b.x, b.y, NEON_CYAN, 4, 120, 0.2, 2)
                            continue
                        dmg = b.damage
                        if "armored" in e.mods or e.spec.can_shield:
                            dmg = max(1, dmg - 1)
                        killed = e.take_damage(dmg)
                        if b.pierce > 0:
                            b.pierce -= 1
                        else:
                            if b in bullets:
                                bullets.remove(b)
                        if killed:
                            if e.kind == "splitter":
                                enemies.append(Enemy("scout", e.x - 10, e.y + 8, wave=wave, group=e.group, mods=[]))
                                enemies.append(Enemy("scout", e.x + 10, e.y + 8, wave=wave, group=e.group, mods=[]))
                            if e.kind == "healer":
                                for ox in (-16, 0, 16):
                                    enemies.append(Enemy(random.choice(["scout", "zigzag"]), e.x + ox, e.y + 8, wave=wave, group=e.group, mods=[]))
                            if e.kind == "warp_gate":
                                for _ in range(2):
                                    enemies.append(Enemy(random.choice(["scout", "hunter", "sniper"]), randf(40, W - 80), randf(20, 110), wave=wave))
                            if e in enemies:
                                enemies.remove(e)
                            add_coins(e.reward)
                            add_kill()
                            spawn_particles(e.x + e.w / 2, e.y + e.h / 2, e.spec.outline, 18, 280, 0.7, 2)
                        break

        for e in enemies[:]:
            if not e.alive:
                if e in enemies:
                    enemies.remove(e)
                continue
            spawned = e.update(dt, player.rect(), wave, active_events, meteors)
            for s in spawned:
                if isinstance(s, EnemyBullet):
                    enemy_bullets.append(s)
                elif isinstance(s, Enemy):
                    enemies.append(s)
                elif isinstance(s, Meteor):
                    meteors.append(s)
            e.draw()
            if e.kind != "boss" and e.visible and e.rect().colliderect(player.rect()):
                if player.hit(1):
                    end_run()
                    break
                if e.kind == "jammer":
                    player.jam_timer = 55
                if e.kind != "warp_gate":
                    e.alive = False
                    if e in enemies:
                        enemies.remove(e)
                    add_coins(e.reward)
                    add_kill()
                    spawn_particles(e.x + e.w / 2, e.y + e.h / 2, e.spec.color, 12, 240, 0.5, 2)
            if e.kind != "boss" and e.kind == "mine" and math.hypot(player.x - e.x, player.y - e.y) < 22:
                e.alive = False
                if player.hit(1):
                    end_run()
                spawn_particles(e.x, e.y, NEON_ORANGE, 14, 260, 0.5, 2)

        for eb in enemy_bullets[:]:
            eb.update(dt)
            if eb.y > H + 20 or eb.x < -20 or eb.x > W + 20 or eb.y < -30:
                enemy_bullets.remove(eb)
                continue
            if pygame.Rect(int(player.x), int(player.y), player.w, player.h).collidepoint(int(eb.x), int(eb.y)):
                if player.hit(1):
                    end_run()
                    break
                if any(e.kind == "jammer" for e in enemies):
                    player.jam_timer = 60
                spawn_particles(player.x + player.w / 2, player.y + player.h / 2, NEON_RED, 18, 280, 0.5, 2)
                if eb in enemy_bullets:
                    enemy_bullets.remove(eb)
            eb.draw()

        for m in meteors[:]:
            m.update(dt)
            for e in enemies[:]:
                if not e.alive:
                    continue
                if e.kind == "boss":
                    if e.hitbox().collidepoint(int(m.x), int(m.y)):
                        e.take_hit(Bullet(m.x, m.y, damage=m.damage))
                        m.alive = False
                else:
                    if e.rect().collidepoint(int(m.x), int(m.y)):
                        if e.take_damage(m.damage):
                            e.alive = False
                        m.alive = False
                        if e in enemies:
                            enemies.remove(e)
                        add_coins(e.reward)
                        add_kill()
                        spawn_particles(m.x, m.y, NEON_ORANGE, 14, 240, 0.5, 2)
                        break
            if pygame.Rect(int(player.x), int(player.y), player.w, player.h).collidepoint(int(m.x), int(m.y)):
                if player.hit(m.damage):
                    end_run()
                m.alive = False
                spawn_particles(m.x, m.y, NEON_RED, 16, 260, 0.55, 2)
            if m.alive:
                m.draw()
            else:
                if m in meteors:
                    meteors.remove(m)

        if boss and boss.alive:
            boss.update(dt, wave)
            boss.draw()
            if pygame.Rect(int(player.x), int(player.y), player.w, player.h).colliderect(boss.hitbox()):
                if player.hit(2):
                    end_run()
                spawn_particles(player.x + player.w / 2, player.y + player.h / 2, NEON_RED, 16, 260, 0.5, 2)
            if boss.hp <= 0:
                if boss in enemies:
                    enemies.remove(boss)
                add_coins(boss.reward)
                add_kill()
                spawn_particles(boss.x + boss.w / 2, boss.y + boss.h / 2, NEON_YELLOW, 80, 420, 1.0, 3)
                set_message(f"{boss.kind.upper()} DOWN!", FPS * 2)
                boss = None

        # boss parts and other status overlays
        if boss and boss.alive:
            draw_text(f"BOSS: {boss.kind.upper()}  HP {max(0, boss.hp)} / {boss.max_hp}", font_small, NEON_ORANGE, W // 2, 94)
            draw_text(f"PHASE: {boss.phase + 1}", font_small, NEON_CYAN, W // 2, 116)
        draw_events_overlay()
        draw_wave_banner()

        for p in particles[:]:
            p.update(dt)
            if p.life <= 0:
                particles.remove(p)
            else:
                p.draw()

        for b in bullets:
            b.draw()
        for eb in enemy_bullets:
            eb.draw()

        player.draw()
        draw_text(f"SCORE: {score}", font_score, NEON_YELLOW, 80, 25)
        draw_text(f"WAVE: {wave}", font_score, NEON_CYAN, 170, 25)
        draw_text(f"COINS: {game_save['coins']}", font_score, NEON_GREEN, 270, 25)
        draw_text(f"LIVES: {player.lives}", font_score, WHITE, 350, 25)
        draw_text(f"SHIELD: {player.shield}", font_score, NEON_BLUE, 440, 25)
        draw_text(f"DIVE-STACK: {len([e for e in enemies if e.alive and e.kind != 'boss'])}", font_small, WHITE, 92, 48)
        if player.jam_timer > 0:
            draw_text("JAMMED!", font_small, NEON_PINK, W // 2, H - 24)
        if message_timer > 0:
            draw_text(message, font_sub, NEON_PURPLE, W // 2, 60)

    elif state == STATE_SHOP:
        panel_w, panel_h = 560, 460
        px = W // 2 - panel_w // 2
        py = H // 2 - panel_h // 2
        pygame.draw.rect(screen, DARK_PANEL, (px, py, panel_w, panel_h), border_radius=16)
        pygame.draw.rect(screen, NEON_BLUE, (px, py, panel_w, panel_h), 2, border_radius=16)
        draw_text("UPGRADE SHOP", font_title, NEON_BLUE, W // 2, py + 44)
        draw_text(f"Coins: {game_save['coins']}", font_sub, NEON_YELLOW, W // 2, py + 96)
        draw_text(shop_message or "Press 1-6 to buy upgrades, SPACE to return.", font_small, WHITE, W // 2, py + 130)
        lines = [
            (f"1 Damage    [{25 * (1 + game_save['upgrades']['damage'])}]", NEON_RED),
            (f"2 Fire Rate [{35 * (1 + game_save['upgrades']['fire_rate'])}]", NEON_CYAN),
            (f"3 Speed     [{30 * (1 + game_save['upgrades']['speed'])}]", NEON_GREEN),
            (f"4 Shield    [{40 * (1 + game_save['upgrades']['shield'])}]", NEON_PURPLE),
            (f"5 Multi     [{45 * (1 + game_save['upgrades']['multishot'])}]", NEON_YELLOW),
            (f"6 Pierce    [{60 * (1 + game_save['upgrades']['pierce'])}]", NEON_ORANGE),
        ]
        yy = py + 182
        for text, col in lines:
            draw_text(text, font_score, col, W // 2, yy)
            yy += 42
        draw_text("SPACE to return to battle", font_sub, WHITE, W // 2, py + 420)

    elif state == STATE_GAMEOVER:
        draw_text("GAME OVER", font_title, NEON_RED, W // 2, H // 2 - 70)
        draw_text(f"FINAL SCORE: {score}", font_sub, WHITE, W // 2, H // 2 - 10)
        draw_text(f"WAVE REACHED: {wave}", font_sub, NEON_CYAN, W // 2, H // 2 + 28)
        draw_text("[ SPACE ] Main Menu", font_sub, NEON_BLUE, W // 2, H // 2 + 95)
        draw_text("[ S ] Shop", font_small, WHITE, W // 2, H // 2 + 130)

    if state == STATE_GAMEPLAY and not enemies and director and director.done_spawning() and not boss and wave_clear_delay <= 0:
        wave_clear_delay = 1.0
    if state == STATE_GAMEPLAY and wave_clear_delay > 0 and not enemies and director and director.done_spawning() and not boss:
        wave_clear_delay -= dt
        if wave_clear_delay <= 0:
            next_wave()
            director = WaveDirector(wave)
            choose_wave_events()

    pygame.display.flip()

pygame.quit()
sys.exit()
