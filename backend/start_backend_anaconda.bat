@echo off
set "PYTHON_EXE=D:\Anaconda\envs\gec_tag_backend\python.exe"
if not exist "%PYTHON_EXE%" (
  echo Conda environment Python not found: %PYTHON_EXE%
  echo Please create it with: D:\Anaconda\Scripts\conda.exe env create -f backend\environment.yml
  exit /b 1
)
pushd "%~dp0.."
"%PYTHON_EXE%" backend\server.py --host 127.0.0.1 --port 8003
set "EXIT_CODE=%ERRORLEVEL%"
popd
exit /b %EXIT_CODE%
