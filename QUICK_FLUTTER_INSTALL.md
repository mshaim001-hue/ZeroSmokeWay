# ⚡ Быстрая установка Flutter

## Проблема с правами Homebrew?

Если получили ошибку прав доступа, выполните:

```bash
sudo chown -R $(whoami) /opt/homebrew/Cellar
```

Затем попробуйте снова:

```bash
brew install --cask flutter
```

## Альтернатива: Ручная установка

Если Homebrew не работает, установите Flutter вручную:

### Шаг 1: Скачайте Flutter

```bash
cd ~
git clone https://github.com/flutter/flutter.git -b stable
```

### Шаг 2: Добавьте в PATH

Откройте `~/.zshrc`:
```bash
nano ~/.zshrc
```

Добавьте в конец:
```bash
export PATH="$PATH:$HOME/flutter/bin"
```

Сохраните (Ctrl+O, Enter, Ctrl+X) и выполните:
```bash
source ~/.zshrc
```

### Шаг 3: Проверка

```bash
flutter doctor
cd ~/Desktop/ZeroSmokeWay/frontend
flutter pub get
flutter run -d chrome
```

## После установки

```bash
# Перейдите в проект
cd ~/Desktop/ZeroSmokeWay/frontend

# Установите зависимости
flutter pub get

# Запустите приложение
flutter run -d chrome
```

