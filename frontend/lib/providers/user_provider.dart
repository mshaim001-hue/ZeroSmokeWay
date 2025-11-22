import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/user_profile.dart';

class UserProvider with ChangeNotifier {
  final SupabaseClient _supabase = Supabase.instance.client;
  
  UserProfile? _profile;
  bool _isLoading = false;
  String? _error;

  UserProfile? get profile => _profile;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadProfile() async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      final user = _supabase.auth.currentUser;
      if (user == null) return;

      final response = await _supabase
          .from('user_profiles')
          .select()
          .eq('user_id', user.id)
          .single();

      if (response != null) {
        _profile = UserProfile.fromJson(response);
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> createProfile(UserProfile profile) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      final user = _supabase.auth.currentUser;
      if (user == null) return;

      await _supabase.from('user_profiles').insert({
        'user_id': user.id,
        ...profile.toJson(),
      });

      _profile = profile;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> updateProfile(UserProfile profile) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      final user = _supabase.auth.currentUser;
      if (user == null) return;

      await _supabase
          .from('user_profiles')
          .update(profile.toJson())
          .eq('user_id', user.id);

      _profile = profile;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}

