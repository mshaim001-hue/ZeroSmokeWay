# 🚀 Установка Flutter для macOS

## Вариант 1: Установка через Homebrew (Рекомендуется)

Самый простой способ:

```bash
# Установка Flutter
brew install --cask flutter

# Проверка установки
flutter doctor
```

## Вариант 2: Ручная установка

### Шаг 1: Скачайте Flutter

```bash
# Перейдите в домашнюю директорию
cd ~

# Скачайте Flutter SDK
git clone https://github.com/flutter/flutter.git -b stable

# Или скачайте архив с https://docs.flutter.dev/get-started/install/macos
```

### Шаг 2: Добавьте Flutter в PATH

Откройте файл `~/.zshrc` (или `~/.bash_profile` если используете bash):

```bash
nano ~/.zshrc
```

Добавьте в конец файла:

```bash
export PATH="$PATH:$HOME/flutter/bin"
```

Сохраните (Ctrl+O, Enter, Ctrl+X) и выполните:

```bash
source ~/.zshrc
```

### Шаг 3: Проверка установки

```bash
flutter doctor
```

## Вариант 3: Использование fvm (Flutter Version Manager)

Если нужно управлять несколькими версиями Flutter:

```bash
# Установка fvm
brew tap leoafarias/fvm
brew install fvm

# Установка Flutter через fvm
fvm install stable
fvm use stable
fvm global stable

# Добавьте в PATH
export PATH="$PATH:$HOME/fvm/default/bin"
```

## ✅ После установки

1. **Проверьте установку:**
```bash
flutter doctor
```

2. **Установите зависимости для проекта:**
```bash
cd frontend
flutter pub get
```

3. **Запустите приложение:**
```bash
flutter run -d chrome
```

## 🔧 Troubleshooting

### Flutter не найден после установки

1. Проверьте, что Flutter добавлен в PATH:
```bash
echo $PATH | grep flutter
```

2. Перезапустите терминал или выполните:
```bash
source ~/.zshrc
```

### Ошибки при `flutter doctor`

- **Android Studio не установлен** - не критично для веб-разработки
- **Xcode не установлен** - не критично для веб-разработки
- **Chrome не найден** - установите Chrome для веб-разработки

Для веб-разработки достаточно:
- ✅ Flutter SDK
- ✅ Chrome браузер

## 📝 Быстрая установка (копируйте и вставьте)

```bash
# Установка через Homebrew
brew install --cask flutter

# Проверка
flutter doctor

# Переход в проект
cd ~/Desktop/ZeroSmokeWay/frontend

# Установка зависимостей
flutter pub get

# Запуск
flutter run -d chrome
```

